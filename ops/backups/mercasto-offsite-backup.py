#!/usr/bin/env python3
import argparse, fcntl, hashlib, json, logging, os, secrets, shutil, subprocess, sys, tempfile, time
from datetime import datetime, timezone
from pathlib import Path

ENV_PATH = Path('/root/.secrets/mercasto-r2-backup.env')
PASS_PATH = Path('/root/.secrets/mercasto-backup-passphrase')
BACKUP_ROOT = Path('/var/www/mercasto/postgres-backups')
STATE_DIR = Path('/var/lib/mercasto-offsite-backup')
STATE_PATH = STATE_DIR / 'state.json'
LOCK_PATH = Path('/run/lock/mercasto-offsite-backup.lock')
LOG_PATH = Path('/var/log/mercasto-offsite-backup.log')
FAILURE_PATH = STATE_DIR / 'FAILED'
MIN_AGE_SECONDS = 120
MAX_STATUS_AGE_HOURS = 30

# Throwaway restore-drill target. The drill must never create a database inside
# the production cluster, so it restores into a dedicated container that has its
# own anonymous volume and no route to anything else. DEFAULT_RESTORE_IMAGE is
# kept equal to the docker-compose postgres pin by
# scripts/offsite-backup-contract-gate.sh, so the drill still proves the dump
# restores on the production PostgreSQL version.
DEFAULT_RESTORE_IMAGE = 'pgvector/pgvector:pg18'
RESTORE_IMAGE = os.environ.get('MERCASTO_RESTORE_DRILL_IMAGE', DEFAULT_RESTORE_IMAGE)
RESTORE_CONTAINER = 'mercasto_restore_drill'
RESTORE_DB = 'mercasto_restore_drill'
RESTORE_USER = 'restore_drill'
RESTORE_READY_ATTEMPTS = 90

logging.basicConfig(level=logging.INFO, format='%(asctime)sZ %(levelname)s %(message)s',
                    handlers=[logging.FileHandler(LOG_PATH), logging.StreamHandler(sys.stdout)])
log = logging.getLogger('mercasto-offsite-backup')

def run(cmd, **kwargs):
    return subprocess.run(cmd, check=True, text=True, **kwargs)

def load_env():
    for raw in ENV_PATH.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        os.environ[k] = v
    required = ['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_ENDPOINT_URL','R2_BUCKET','R2_PREFIX']
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        raise RuntimeError('missing R2 config keys: ' + ','.join(missing))

def s3_client():
    import boto3
    return boto3.client('s3', endpoint_url=os.environ['AWS_ENDPOINT_URL'],
        region_name=os.environ.get('AWS_DEFAULT_REGION','auto'),
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()

def toc_entries(path):
    path = Path(path)
    copied = False
    if path.parent.resolve() == BACKUP_ROOT.resolve():
        remote = f'/backups/{path.name}'
    else:
        remote = f'/tmp/offsite-verify-{os.getpid()}-{path.name}'
        run(['docker','cp',str(path),f'mercasto_db_backup:{remote}'], stdout=subprocess.DEVNULL)
        copied = True
    try:
        p = run(['docker','exec','mercasto_db_backup','pg_restore','-l',remote], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        count = sum(1 for line in p.stdout.splitlines() if line and not line.startswith(';'))
        if count < 50:
            raise RuntimeError(f'pg_restore TOC unexpectedly small: {count}')
        return count
    finally:
        if copied:
            subprocess.run(['docker','exec','mercasto_db_backup','rm','-f',remote], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def latest_completed_dump():
    now = datetime.now(timezone.utc).timestamp()
    files = sorted(BACKUP_ROOT.glob('backup_*.dump'), key=lambda p: p.stat().st_mtime, reverse=True)
    for path in files:
        a = path.stat()
        if now - a.st_mtime < MIN_AGE_SECONDS or a.st_size <= 0:
            continue
        count = toc_entries(path)
        b = path.stat()
        if (a.st_size, a.st_mtime_ns) == (b.st_size, b.st_mtime_ns):
            return path, count
    raise RuntimeError('no stable completed backup_*.dump found')

def encrypt(src, dst):
    run(['openssl','enc','-aes-256-cbc','-salt','-pbkdf2','-iter','310000','-md','sha256',
         '-in',str(src),'-out',str(dst),'-pass',f'file:{PASS_PATH}'], stdout=subprocess.DEVNULL)
    os.chmod(dst, 0o600)

def decrypt(src, dst):
    run(['openssl','enc','-d','-aes-256-cbc','-pbkdf2','-iter','310000','-md','sha256',
         '-in',str(src),'-out',str(dst),'-pass',f'file:{PASS_PATH}'], stdout=subprocess.DEVNULL)
    os.chmod(dst, 0o600)

def tier_keys(prefix, tier, stamp, name):
    if tier == 'daily': part = stamp.strftime('%Y/%m/%d')
    elif tier == 'weekly': part = stamp.strftime('%G/W%V')
    elif tier == 'monthly': part = stamp.strftime('%Y/%m')
    else: raise ValueError(tier)
    root = f"{prefix.rstrip('/')}/{tier}/{part}/{name}"
    return root + '.enc', root + '.sha256', root + '.enc.sha256'

def upload_and_verify(s3, bucket, keys, src, plain_hash, toc_count, work):
    enc = work / (src.name + '.enc')
    manifest = work / (src.name + '.sha256')
    enc_manifest = work / (src.name + '.enc.sha256')
    encrypt(src, enc)
    enc_hash = sha256(enc)
    manifest.write_text(f'{plain_hash}  {src.name}\n')
    enc_manifest.write_text(f'{enc_hash}  {src.name}.enc\n')
    os.chmod(manifest, 0o600); os.chmod(enc_manifest, 0o600)
    enc_key, manifest_key, enc_manifest_key = keys
    common_meta = {'source-sha256': plain_hash, 'toc-entries': str(toc_count)}
    s3.upload_file(str(enc), bucket, enc_key, ExtraArgs={'Metadata': {**common_meta, 'encrypted-sha256': enc_hash}})
    s3.upload_file(str(manifest), bucket, manifest_key, ExtraArgs={'ContentType':'text/plain','Metadata':common_meta})
    s3.upload_file(str(enc_manifest), bucket, enc_manifest_key, ExtraArgs={'ContentType':'text/plain','Metadata':common_meta})
    remote_enc = work / ('remote-' + enc.name)
    remote_manifest = work / ('remote-' + manifest.name)
    remote_plain = work / ('remote-' + src.name)
    s3.download_file(bucket, enc_key, str(remote_enc))
    s3.download_file(bucket, manifest_key, str(remote_manifest))
    if sha256(remote_enc) != enc_hash:
        raise RuntimeError('encrypted remote checksum mismatch')
    expected = remote_manifest.read_text().split()[0]
    if expected != plain_hash:
        raise RuntimeError('remote manifest mismatch')
    decrypt(remote_enc, remote_plain)
    if sha256(remote_plain) != plain_hash:
        raise RuntimeError('decrypted remote checksum mismatch')
    remote_toc = toc_entries(remote_plain)
    if remote_toc != toc_count:
        raise RuntimeError(f'remote TOC mismatch: local={toc_count} remote={remote_toc}')
    return enc_hash, remote_plain, remote_toc

def start_drill_container():
    # Reclaim a container left behind by a previous killed run first, so a stale
    # drill container can never be mistaken for a live one. docker rm -f -v also
    # removes the container's own anonymous volume.
    subprocess.run(['docker','rm','-f','-v',RESTORE_CONTAINER], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    # The credential is passed BY NAME: '-e POSTGRES_PASSWORD' with no value makes
    # docker read it from this process environment, so the secret never enters
    # argv and therefore can never surface in a CalledProcessError message or log.
    env = dict(os.environ, POSTGRES_PASSWORD=secrets.token_hex(24))
    run(['docker','run','-d',
         '--name',RESTORE_CONTAINER,
         '--network','none',
         '--label','mercasto=restore-drill',
         '-e',f'POSTGRES_USER={RESTORE_USER}',
         '-e','POSTGRES_PASSWORD',
         '-e',f'POSTGRES_DB={RESTORE_DB}',
         RESTORE_IMAGE],
        stdout=subprocess.DEVNULL, env=env)

def wait_for_drill_container():
    # Readiness must mean "the FINAL postmaster accepts queries", not just
    # "something is listening". The image entrypoint runs initdb behind a
    # temporary server that then exits, so a bare pg_isready probe can succeed
    # and vanish, failing the restore on a closed socket. Require two consecutive
    # successful queries with an unchanged postmaster start time instead.
    previous = None
    for _ in range(RESTORE_READY_ATTEMPTS):
        try:
            probe = run(['docker','exec',RESTORE_CONTAINER,'psql','-U',RESTORE_USER,'-d',RESTORE_DB,
                         '-X','-Atqc','SELECT pg_postmaster_start_time();'],
                        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            current = probe.stdout.strip()
        except subprocess.CalledProcessError:
            current = ''
        if current:
            if current == previous:
                return
            previous = current
        else:
            previous = None
        time.sleep(1)
    raise RuntimeError('restore drill container did not become ready')

def scratch_restore(downloaded):
    """Restore the newest dump into a throwaway container and verify it.

    Isolation contract, asserted by scripts/offsite-backup-contract-gate.sh:
      * a dedicated container, never the production database container;
      * --network none and no published host port;
      * its own anonymous volume, never the production data directory.
    Cleanup runs in a single finally block, so it holds on success and on every
    failure. A SIGKILL cannot run it, but the next run's leading `docker rm -f -v`
    reclaims both the container and its volume.
    """
    try:
        start_drill_container()
        wait_for_drill_container()
        remote = f'/tmp/{RESTORE_DB}.dump'
        run(['docker','cp',str(downloaded),f'{RESTORE_CONTAINER}:{remote}'], stdout=subprocess.DEVNULL)
        run(['docker','exec',RESTORE_CONTAINER,'pg_restore',
             '-U',RESTORE_USER,'-d',RESTORE_DB,
             '--no-owner','--no-privileges',remote],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        q = run(['docker','exec',RESTORE_CONTAINER,'psql','-U',RESTORE_USER,'-d',RESTORE_DB,
                 '-X','-Atqc',"select count(*) from pg_tables where schemaname='public';"],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        tables = int(q.stdout.strip())
        if tables < 10:
            raise RuntimeError(f'scratch restore has too few public tables: {tables}')
        return {'database': RESTORE_DB, 'container': RESTORE_CONTAINER, 'public_tables': tables, 'result': 'success'}
    finally:
        subprocess.run(['docker','rm','-f','-v',RESTORE_CONTAINER], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def write_state(data):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, indent=2, sort_keys=True) + '\n')
    os.chmod(tmp, 0o600)
    os.replace(tmp, STATE_PATH)

def status(s3, bucket):
    if not STATE_PATH.exists():
        raise RuntimeError('offsite backup state missing')
    state = json.loads(STATE_PATH.read_text())
    last = datetime.fromisoformat(state['last_success_utc'].replace('Z','+00:00'))
    age = (datetime.now(timezone.utc) - last).total_seconds() / 3600
    if age > MAX_STATUS_AGE_HOURS:
        raise RuntimeError(f'offsite backup stale: {age:.1f}h')
    key = state['remote']['daily']['encrypted_key']
    head = s3.head_object(Bucket=bucket, Key=key)
    if head.get('Metadata',{}).get('source-sha256') != state['source_sha256']:
        raise RuntimeError('remote object metadata checksum mismatch')
    drill = state.get('last_restore_drill', state.get('restore_drill', {}))
    print(f'offsite_backup=ready age_hours={age:.1f} source={state["source"]} restore_drill={drill.get("result","not-run")}')

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--seed-retention', action='store_true')
    p.add_argument('--restore-drill', action='store_true')
    p.add_argument('--status', action='store_true')
    args=p.parse_args()
    if os.geteuid() != 0: raise SystemExit('must run as root')
    if not ENV_PATH.exists() or not PASS_PATH.exists(): raise RuntimeError('backup secret files missing')
    if (ENV_PATH.stat().st_mode & 0o077) or (PASS_PATH.stat().st_mode & 0o077): raise RuntimeError('backup secret permissions too broad')
    load_env(); s3=s3_client(); bucket=os.environ['R2_BUCKET']; prefix=os.environ['R2_PREFIX']
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOCK_PATH,'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.status:
            status(s3,bucket); return
        src,toc=latest_completed_dump(); plain_hash=sha256(src)
        stamp=datetime.fromtimestamp(src.stat().st_mtime, timezone.utc)
        tiers=['daily']
        if args.seed_retention or stamp.weekday()==6: tiers.append('weekly')
        if args.seed_retention or stamp.day==1: tiers.append('monthly')
        previous = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}
        remote = dict(previous.get('remote', {})); downloaded_for_drill=None
        with tempfile.TemporaryDirectory(prefix='mercasto-offsite-', dir=str(STATE_DIR.mkdir(parents=True,exist_ok=True) or STATE_DIR)) as td:
            work=Path(td)
            for tier in tiers:
                keys=tier_keys(prefix,tier,stamp,src.name)
                enc_hash, downloaded, remote_toc=upload_and_verify(s3,bucket,keys,src,plain_hash,toc,work)
                remote[tier]={'encrypted_key':keys[0],'manifest_key':keys[1],'encrypted_manifest_key':keys[2],'encrypted_sha256':enc_hash,'toc_entries':remote_toc}
                if tier=='daily':
                    downloaded_for_drill=work / ('drill-' + src.name)
                    shutil.copy2(downloaded, downloaded_for_drill)
                log.info('verified remote tier=%s source=%s toc=%d',tier,src.name,remote_toc)
            drill = previous.get('last_restore_drill', previous.get('restore_drill', {'result':'not-run'}))
            if args.restore_drill:
                drill=scratch_restore(downloaded_for_drill)
                drill['completed_at_utc']=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
                log.info('scratch restore verified public_tables=%d',drill['public_tables'])
            state={'last_success_utc':datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),'source':src.name,'source_mtime_utc':stamp.isoformat().replace('+00:00','Z'),'source_size_bytes':src.stat().st_size,'source_sha256':plain_hash,'toc_entries':toc,'remote':remote,'last_restore_drill':drill,'encryption':'AES-256-CBC PBKDF2-SHA256 iter=310000'}
            write_state(state)
            FAILURE_PATH.unlink(missing_ok=True)
        status(s3,bucket)
        log.info('offsite replication complete source=%s tiers=%s',src.name,','.join(tiers))

if __name__=='__main__':
    try: main()
    except BlockingIOError:
        log.warning('another offsite backup process is already running'); sys.exit(0)
    except Exception as e:
        log.error('offsite backup failed: %s', e)
        raise
