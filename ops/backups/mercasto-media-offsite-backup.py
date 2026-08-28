#!/usr/bin/env python3
import argparse
import fcntl
import hashlib
import json
import logging
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

ENV_PATH = Path('/root/.secrets/mercasto-r2-backup.env')
PASS_PATH = Path('/root/.secrets/mercasto-backup-passphrase')
SOURCE_ROOT = Path('/var/www/mercasto/backend/storage/app/public')
STATE_DIR = Path('/var/lib/mercasto-media-offsite-backup')
STATE_PATH = STATE_DIR / 'state.json'
LOCK_PATH = Path('/run/lock/mercasto-media-offsite-backup.lock')
LOG_PATH = Path('/var/log/mercasto-media-offsite-backup.log')
FAILURE_PATH = STATE_DIR / 'FAILED'
MAX_STATUS_AGE_HOURS = 30
RETENTION = {'daily': 14, 'weekly': 8, 'monthly': 12}
MANIFEST_NAME = '__mercasto_media_manifest.json'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)sZ %(levelname)s %(message)s',
    handlers=[logging.FileHandler(LOG_PATH), logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger('mercasto-media-offsite-backup')


def run(cmd, **kwargs):
    return subprocess.run(cmd, check=True, text=True, **kwargs)


def utcnow():
    return datetime.now(timezone.utc)


def iso_now():
    return utcnow().isoformat().replace('+00:00', 'Z')


def load_env():
    for raw in ENV_PATH.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        os.environ[key] = value
    required = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_ENDPOINT_URL', 'R2_BUCKET', 'R2_PREFIX']
    missing = [key for key in required if not os.environ.get(key)]
    if missing:
        raise RuntimeError('missing R2 config keys: ' + ','.join(missing))


def s3_client():
    import boto3
    return boto3.client(
        's3',
        endpoint_url=os.environ['AWS_ENDPOINT_URL'],
        region_name=os.environ.get('AWS_DEFAULT_REGION', 'auto'),
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def safe_relative(path):
    rel = path.relative_to(SOURCE_ROOT).as_posix()
    pure = PurePosixPath(rel)
    if pure.is_absolute() or '..' in pure.parts or rel in ('', '.'):
        raise RuntimeError(f'unsafe media path: {rel}')
    return rel


def source_files():
    if not SOURCE_ROOT.is_dir():
        raise RuntimeError(f'media source missing: {SOURCE_ROOT}')
    files = []
    for path in SOURCE_ROOT.rglob('*'):
        if path.is_symlink():
            raise RuntimeError(f'symlink is not allowed in media source: {path}')
        if path.is_file():
            files.append(path)
    return sorted(files, key=lambda path: safe_relative(path))


def quick_signature():
    digest = hashlib.sha256()
    count = 0
    for path in source_files():
        stat = path.stat()
        rel = safe_relative(path)
        digest.update(f'{rel}\0{stat.st_size}\0{stat.st_mtime_ns}\n'.encode())
        count += 1
    return digest.hexdigest(), count


def tree_hash(entries):
    digest = hashlib.sha256()
    for entry in entries:
        digest.update(f"{entry['path']}\0{entry['size']}\0{entry['sha256']}\n".encode())
    return digest.hexdigest()


def scan_source():
    entries = []
    total = 0
    quick = hashlib.sha256()
    for path in source_files():
        before = path.stat()
        rel = safe_relative(path)
        content_hash = sha256_file(path)
        after = path.stat()
        if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
            raise RuntimeError(f'media file changed while hashing: {rel}')
        entries.append({'path': rel, 'size': after.st_size, 'sha256': content_hash})
        quick.update(f'{rel}\0{after.st_size}\0{after.st_mtime_ns}\n'.encode())
        total += after.st_size
    if not entries:
        raise RuntimeError('media source is empty')
    return {
        'entries': entries,
        'tree_hash': tree_hash(entries),
        'file_count': len(entries),
        'total_bytes': total,
        'quick_signature': quick.hexdigest(),
    }


def manifest_payload(scan):
    return {
        'schema': 1,
        'created_at_utc': iso_now(),
        'source': str(SOURCE_ROOT),
        'tree_hash': scan['tree_hash'],
        'file_count': scan['file_count'],
        'total_bytes': scan['total_bytes'],
        'files': scan['entries'],
    }


def build_snapshot(scan, work):
    manifest = manifest_payload(scan)
    manifest_path = work / MANIFEST_NAME
    manifest_path.write_text(json.dumps(manifest, sort_keys=True, separators=(',', ':')) + '\n')
    os.chmod(manifest_path, 0o600)
    archive = work / f"mercasto-media-{scan['tree_hash']}.tar"
    with tarfile.open(archive, 'w', format=tarfile.PAX_FORMAT) as tar:
        tar.add(manifest_path, arcname=MANIFEST_NAME, recursive=False)
        for entry in scan['entries']:
            src = SOURCE_ROOT / entry['path']
            tar.add(src, arcname='public/' + entry['path'], recursive=False)
    post_quick, post_count = quick_signature()
    if post_count != scan['file_count'] or post_quick != scan['quick_signature']:
        raise RuntimeError('media source changed while snapshot was being created; retry required')
    return archive


def validate_member_name(name):
    pure = PurePosixPath(name)
    if pure.is_absolute() or '..' in pure.parts or name in ('', '.'):
        raise RuntimeError(f'unsafe archive member: {name}')


def inspect_archive(archive):
    with tarfile.open(archive, 'r') as tar:
        members = tar.getmembers()
        for member in members:
            validate_member_name(member.name)
            if not (member.isfile() or member.isdir()):
                raise RuntimeError(f'unsupported archive member type: {member.name}')
        try:
            raw_manifest = tar.extractfile(MANIFEST_NAME)
        except KeyError as exc:
            raise RuntimeError('media archive manifest missing') from exc
        if raw_manifest is None:
            raise RuntimeError('media archive manifest is unreadable')
        manifest = json.loads(raw_manifest.read().decode())
        expected = manifest.get('files')
        if manifest.get('schema') != 1 or not isinstance(expected, list) or not expected:
            raise RuntimeError('media archive manifest is invalid')
        member_map = {member.name: member for member in members if member.isfile()}
        verified = []
        total = 0
        for entry in expected:
            rel = str(entry.get('path', ''))
            validate_member_name(rel)
            name = 'public/' + rel
            member = member_map.get(name)
            if member is None:
                raise RuntimeError(f'media archive file missing: {rel}')
            if member.size != int(entry.get('size', -1)):
                raise RuntimeError(f'media archive size mismatch: {rel}')
            fileobj = tar.extractfile(member)
            if fileobj is None:
                raise RuntimeError(f'media archive file unreadable: {rel}')
            digest = hashlib.sha256()
            for block in iter(lambda: fileobj.read(1024 * 1024), b''):
                digest.update(block)
            if digest.hexdigest() != entry.get('sha256'):
                raise RuntimeError(f'media archive checksum mismatch: {rel}')
            verified.append({'path': rel, 'size': member.size, 'sha256': digest.hexdigest()})
            total += member.size
        computed = tree_hash(verified)
        if computed != manifest.get('tree_hash'):
            raise RuntimeError('media archive tree hash mismatch')
        if len(verified) != int(manifest.get('file_count', -1)):
            raise RuntimeError('media archive file count mismatch')
        if total != int(manifest.get('total_bytes', -1)):
            raise RuntimeError('media archive byte count mismatch')
        return {
            'tree_hash': computed,
            'file_count': len(verified),
            'total_bytes': total,
            'manifest': manifest,
        }


def encrypt(src, dst):
    run([
        'openssl', 'enc', '-aes-256-cbc', '-salt', '-pbkdf2', '-iter', '310000', '-md', 'sha256',
        '-in', str(src), '-out', str(dst), '-pass', f'file:{PASS_PATH}',
    ], stdout=subprocess.DEVNULL)
    os.chmod(dst, 0o600)


def decrypt(src, dst):
    run([
        'openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '310000', '-md', 'sha256',
        '-in', str(src), '-out', str(dst), '-pass', f'file:{PASS_PATH}',
    ], stdout=subprocess.DEVNULL)
    os.chmod(dst, 0o600)


def media_root(prefix):
    return f"{prefix.rstrip('/')}/media"


def object_key(prefix, tree):
    return f'{media_root(prefix)}/objects/{tree}.tar.enc'


def marker_key(prefix, tier, stamp, tree):
    if tier == 'daily':
        part = stamp.strftime('%Y/%m/%d')
    elif tier == 'weekly':
        part = stamp.strftime('%G/W%V')
    elif tier == 'monthly':
        part = stamp.strftime('%Y/%m')
    else:
        raise ValueError(tier)
    return f'{media_root(prefix)}/{tier}/{part}/{tree}.json'


def remote_object_matches(s3, bucket, key, tree, encrypted_hash=None):
    try:
        head = s3.head_object(Bucket=bucket, Key=key)
    except Exception:
        return False
    metadata = head.get('Metadata', {})
    if metadata.get('tree-hash') != tree:
        return False
    if encrypted_hash and metadata.get('encrypted-sha256') != encrypted_hash:
        return False
    return True


def upload_snapshot(s3, bucket, prefix, archive, scan, work):
    archive_info = inspect_archive(archive)
    if archive_info['tree_hash'] != scan['tree_hash']:
        raise RuntimeError('local media snapshot does not match source scan')
    archive_hash = sha256_file(archive)
    encrypted = work / (archive.name + '.enc')
    encrypt(archive, encrypted)
    encrypted_hash = sha256_file(encrypted)
    key = object_key(prefix, scan['tree_hash'])
    s3.upload_file(
        str(encrypted), bucket, key,
        ExtraArgs={'Metadata': {
            'tree-hash': scan['tree_hash'],
            'archive-sha256': archive_hash,
            'encrypted-sha256': encrypted_hash,
            'file-count': str(scan['file_count']),
            'total-bytes': str(scan['total_bytes']),
        }},
    )
    verified = verify_remote_snapshot(
        s3, bucket, key, scan['tree_hash'], archive_hash, encrypted_hash, work, extract=False,
    )
    return {
        'object_key': key,
        'archive_sha256': archive_hash,
        'encrypted_sha256': encrypted_hash,
        **verified,
    }


def verify_remote_snapshot(s3, bucket, key, tree, archive_hash, encrypted_hash, work, extract=False):
    remote_enc = work / 'remote-media.tar.enc'
    remote_tar = work / 'remote-media.tar'
    s3.download_file(bucket, key, str(remote_enc))
    if sha256_file(remote_enc) != encrypted_hash:
        raise RuntimeError('remote media encrypted checksum mismatch')
    decrypt(remote_enc, remote_tar)
    if sha256_file(remote_tar) != archive_hash:
        raise RuntimeError('remote media archive checksum mismatch')
    info = inspect_archive(remote_tar)
    if info['tree_hash'] != tree:
        raise RuntimeError('remote media tree hash mismatch')
    result = {
        'tree_hash': info['tree_hash'],
        'file_count': info['file_count'],
        'total_bytes': info['total_bytes'],
    }
    if extract:
        result['scratch_restore'] = scratch_restore(remote_tar, info, work)
    return result


def scratch_restore(archive, expected, work):
    target = work / 'restore'
    public = target / 'public'
    public.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, 'r') as tar:
        manifest_member = tar.getmember(MANIFEST_NAME)
        manifest_file = tar.extractfile(manifest_member)
        manifest = json.loads(manifest_file.read().decode()) if manifest_file else None
        if not isinstance(manifest, dict):
            raise RuntimeError('restore manifest unreadable')
        for entry in manifest['files']:
            rel = str(entry['path'])
            validate_member_name(rel)
            member = tar.getmember('public/' + rel)
            if not member.isfile():
                raise RuntimeError(f'restore member is not a file: {rel}')
            src = tar.extractfile(member)
            if src is None:
                raise RuntimeError(f'restore member unreadable: {rel}')
            dst = public / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            with open(dst, 'wb') as handle:
                shutil.copyfileobj(src, handle, 1024 * 1024)
    restored = []
    total = 0
    for path in sorted(public.rglob('*')):
        if path.is_file():
            rel = path.relative_to(public).as_posix()
            size = path.stat().st_size
            digest = sha256_file(path)
            restored.append({'path': rel, 'size': size, 'sha256': digest})
            total += size
    restored_tree = tree_hash(restored)
    if restored_tree != expected['tree_hash'] or len(restored) != expected['file_count'] or total != expected['total_bytes']:
        raise RuntimeError('media scratch restore verification failed')
    return {'result': 'success', 'tree_hash': restored_tree, 'file_count': len(restored), 'total_bytes': total}


def put_marker(s3, bucket, prefix, tier, stamp, state):
    key = marker_key(prefix, tier, stamp, state['tree_hash'])
    payload = {
        'created_at_utc': iso_now(),
        'tier': tier,
        'tree_hash': state['tree_hash'],
        'object_key': state['remote']['object_key'],
        'archive_sha256': state['remote']['archive_sha256'],
        'encrypted_sha256': state['remote']['encrypted_sha256'],
        'file_count': state['file_count'],
        'total_bytes': state['total_bytes'],
    }
    s3.put_object(Bucket=bucket, Key=key, Body=(json.dumps(payload, sort_keys=True) + '\n').encode(), ContentType='application/json')
    return key


def list_objects(s3, bucket, prefix):
    token = None
    while True:
        kwargs = {'Bucket': bucket, 'Prefix': prefix}
        if token:
            kwargs['ContinuationToken'] = token
        page = s3.list_objects_v2(**kwargs)
        for item in page.get('Contents', []):
            yield item
        if not page.get('IsTruncated'):
            return
        token = page.get('NextContinuationToken')


def prune_retention(s3, bucket, prefix):
    retained_marker_keys = set()
    for tier, keep in RETENTION.items():
        root = f'{media_root(prefix)}/{tier}/'
        items = [item for item in list_objects(s3, bucket, root) if item['Key'].endswith('.json')]
        items.sort(key=lambda item: item['LastModified'], reverse=True)
        for item in items[:keep]:
            retained_marker_keys.add(item['Key'])
        for item in items[keep:]:
            s3.delete_object(Bucket=bucket, Key=item['Key'])
            log.info('pruned media marker tier=%s key=%s', tier, item['Key'])
    referenced = set()
    for key in retained_marker_keys:
        body = s3.get_object(Bucket=bucket, Key=key)['Body'].read()
        marker = json.loads(body.decode())
        object_ref = marker.get('object_key')
        if object_ref:
            referenced.add(object_ref)
    objects_root = f'{media_root(prefix)}/objects/'
    for item in list_objects(s3, bucket, objects_root):
        key = item['Key']
        if key not in referenced:
            s3.delete_object(Bucket=bucket, Key=key)
            log.info('pruned unreferenced media object key=%s', key)


def write_state(data):
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE_PATH.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, indent=2, sort_keys=True) + '\n')
    os.chmod(tmp, 0o600)
    os.replace(tmp, STATE_PATH)


def status(s3, bucket):
    if not STATE_PATH.exists():
        raise RuntimeError('media offsite backup state missing')
    state = json.loads(STATE_PATH.read_text())
    last = datetime.fromisoformat(state['last_success_utc'].replace('Z', '+00:00'))
    age = (utcnow() - last).total_seconds() / 3600
    if age > MAX_STATUS_AGE_HOURS:
        raise RuntimeError(f'media offsite backup stale: {age:.1f}h')
    remote = state['remote']
    if not remote_object_matches(s3, bucket, remote['object_key'], state['tree_hash'], remote['encrypted_sha256']):
        raise RuntimeError('media remote object metadata mismatch')
    drill = state.get('last_restore_drill', {'result': 'not-run'})
    print(
        f"media_offsite_backup=ready age_hours={age:.1f} files={state['file_count']} "
        f"bytes={state['total_bytes']} tree={state['tree_hash'][:16]} restore_drill={drill.get('result', 'not-run')}"
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seed-retention', action='store_true')
    parser.add_argument('--restore-drill', action='store_true')
    parser.add_argument('--status', action='store_true')
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise SystemExit('must run as root')
    if not ENV_PATH.exists() or not PASS_PATH.exists():
        raise RuntimeError('backup secret files missing')
    if (ENV_PATH.stat().st_mode & 0o077) or (PASS_PATH.stat().st_mode & 0o077):
        raise RuntimeError('backup secret permissions too broad')
    load_env()
    s3 = s3_client()
    bucket = os.environ['R2_BUCKET']
    prefix = os.environ['R2_PREFIX']
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    os.chmod(STATE_DIR, 0o700)
    LOCK_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOCK_PATH, 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.status:
            status(s3, bucket)
            return
        previous = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {}
        scan = scan_source()
        stamp = utcnow()
        tiers = ['daily']
        if args.seed_retention or stamp.weekday() == 6:
            tiers.append('weekly')
        if args.seed_retention or stamp.day == 1:
            tiers.append('monthly')
        with tempfile.TemporaryDirectory(prefix='mercasto-media-offsite-', dir=str(STATE_DIR)) as tempdir:
            work = Path(tempdir)
            same_tree = previous.get('tree_hash') == scan['tree_hash']
            previous_remote = previous.get('remote', {})
            if same_tree and previous_remote and remote_object_matches(
                s3, bucket, previous_remote.get('object_key', ''), scan['tree_hash'], previous_remote.get('encrypted_sha256')
            ):
                remote = previous_remote
                log.info('media tree unchanged; reusing content-addressed remote object tree=%s', scan['tree_hash'][:16])
            else:
                archive = build_snapshot(scan, work)
                remote = upload_snapshot(s3, bucket, prefix, archive, scan, work)
                log.info('uploaded and verified new media snapshot tree=%s files=%d bytes=%d', scan['tree_hash'][:16], scan['file_count'], scan['total_bytes'])
            drill = previous.get('last_restore_drill', {'result': 'not-run'})
            if args.restore_drill:
                verified = verify_remote_snapshot(
                    s3, bucket, remote['object_key'], scan['tree_hash'], remote['archive_sha256'], remote['encrypted_sha256'], work, extract=True,
                )
                drill = verified['scratch_restore']
                drill['completed_at_utc'] = iso_now()
                log.info('media scratch restore verified tree=%s files=%d', scan['tree_hash'][:16], drill['file_count'])
            state = {
                'last_success_utc': iso_now(),
                'source': str(SOURCE_ROOT),
                'tree_hash': scan['tree_hash'],
                'file_count': scan['file_count'],
                'total_bytes': scan['total_bytes'],
                'remote': remote,
                'last_restore_drill': drill,
                'encryption': 'AES-256-CBC PBKDF2-SHA256 iter=310000',
            }
            markers = dict(previous.get('markers', {}))
            for tier in tiers:
                markers[tier] = put_marker(s3, bucket, prefix, tier, stamp, state)
            state['markers'] = markers
            write_state(state)
            FAILURE_PATH.unlink(missing_ok=True)
            prune_retention(s3, bucket, prefix)
        status(s3, bucket)
        log.info('media offsite replication complete tree=%s tiers=%s', scan['tree_hash'][:16], ','.join(tiers))


if __name__ == '__main__':
    try:
        main()
    except BlockingIOError:
        log.warning('another media offsite backup process is already running')
        sys.exit(0)
    except Exception as exc:
        log.error('media offsite backup failed: %s', exc)
        raise
