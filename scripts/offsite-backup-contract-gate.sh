#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP="ops/backups/mercasto-offsite-backup.py"
SMOKE="scripts/offsite-backup-smoke.sh"
MEDIA_BACKUP="ops/backups/mercasto-media-offsite-backup.py"
MEDIA_SMOKE="scripts/media-offsite-backup-smoke.sh"
SERVER="scripts/server-operator.sh"
for f in "$BACKUP" "$SMOKE" "$MEDIA_BACKUP" "$MEDIA_SMOKE" ops/systemd/mercasto-offsite-backup.service \
  ops/systemd/mercasto-offsite-backup.timer ops/systemd/mercasto-offsite-backup-alert.service \
  ops/systemd/mercasto-offsite-restore-drill.service ops/systemd/mercasto-offsite-restore-drill.timer \
  ops/systemd/mercasto-media-offsite-backup.service ops/systemd/mercasto-media-offsite-backup.timer \
  ops/systemd/mercasto-media-offsite-backup-alert.service ops/systemd/mercasto-media-offsite-restore-drill.service \
  ops/systemd/mercasto-media-offsite-restore-drill.timer; do
  test -f "$f"
done
grep -qF "AES-256-CBC PBKDF2-SHA256" "$BACKUP"
grep -qF "310000" "$BACKUP"
grep -qF "backup_*.dump" "$BACKUP"
grep -qF "s3.upload_file" "$BACKUP"
grep -qF "s3.download_file" "$BACKUP"
grep -qF "pg_restore" "$BACKUP"
grep -qF "scratch_restore" "$BACKUP"
grep -qF "UMask=0077" ops/systemd/mercasto-offsite-backup.service
grep -qF "OnFailure=mercasto-offsite-backup-alert.service" ops/systemd/mercasto-offsite-backup.service
grep -qF "OnCalendar=*-*-* 00,06,12,18:30:00 UTC" ops/systemd/mercasto-offsite-backup.timer
grep -qF "OnCalendar=*-*-01 21:30:00 UTC" ops/systemd/mercasto-offsite-restore-drill.timer
grep -qF "AES-256-CBC PBKDF2-SHA256" "$MEDIA_BACKUP"
grep -qF "310000" "$MEDIA_BACKUP"
grep -qF "/var/www/mercasto/backend/storage/app/public" "$MEDIA_BACKUP"
grep -qF "content-addressed remote object" "$MEDIA_BACKUP"
grep -qF "scratch_restore" "$MEDIA_BACKUP"
grep -qF "s3.upload_file" "$MEDIA_BACKUP"
grep -qF "s3.download_file" "$MEDIA_BACKUP"
grep -qF "UMask=0077" ops/systemd/mercasto-media-offsite-backup.service
grep -qF "OnFailure=mercasto-media-offsite-backup-alert.service" ops/systemd/mercasto-media-offsite-backup.service
grep -qF "OnCalendar=*-*-* 02:30:00 UTC" ops/systemd/mercasto-media-offsite-backup.timer
grep -qF "OnCalendar=Sun *-*-* 03:30:00 UTC" ops/systemd/mercasto-media-offsite-restore-drill.timer
grep -qF "bash scripts/offsite-backup-smoke.sh" "$SERVER"
grep -qF "bash scripts/media-offsite-backup-smoke.sh" "$SERVER"
grep -qF 'run_root test -x "$STATUS_BIN"' "$SMOKE"
grep -qF 'run_root test -x "$STATUS_BIN"' "$MEDIA_SMOKE"
if grep -qE '^test -x "\$STATUS_BIN"$' "$SMOKE"; then
  echo "FAIL: offsite smoke checks the root-only status binary without run_root" >&2
  exit 1
fi
# The secret scan below reads three trees. ops/ and scripts/ are implied by the
# file assertions above; docs/ is not, and a missing tree makes the scan exit
# non-zero and pass while leaving that surface unobserved.
for root in ops scripts docs; do
  test -d "$root" || { echo "FAIL: missing scan root $root" >&2; exit 1; }
done
if grep -RIEq --exclude=offsite-backup-contract-gate.sh 'AWS_SECRET_ACCESS_KEY=[A-Za-z0-9_/+=-]{16,}|R2_[A-Z_]*SECRET=[A-Za-z0-9_/+=-]{16,}' ops scripts docs; then
  echo "FAIL: possible offsite-backup secret committed" >&2
  exit 1
fi

# The restore drill must restore into a throwaway container, never into the
# production database container. Creating a scratch database inside the
# production cluster consumed the live data directory and leaked one permanently
# whenever the drill was killed between createdb and dropdb.
if grep -qF 'mercasto_db_container' "$BACKUP"; then
  echo "FAIL: offsite restore drill references the production database container" >&2
  exit 1
fi
grep -qF "'--network','none'" "$BACKUP"
grep -qF "'docker','rm','-f','-v'" "$BACKUP"
grep -qF "'docker','cp',str(downloaded)" "$BACKUP"
# Readiness must wait for the final postmaster, not the entrypoint's temporary
# initdb server, or the restore races a closing socket.
grep -qF 'pg_postmaster_start_time' "$BACKUP"
# The drill must still exercise the PostgreSQL version production actually runs.
compose_pg_image="$(sed -nE 's/^[[:space:]]*image:[[:space:]]*(pgvector\/pgvector:[^@[:space:]]+)@.*$/\1/p' docker-compose.yml | head -n1)"
test -n "$compose_pg_image"
if ! grep -qF "DEFAULT_RESTORE_IMAGE = '$compose_pg_image'" "$BACKUP"; then
  echo "FAIL: restore drill image does not match the compose postgres pin ($compose_pg_image)" >&2
  exit 1
fi

echo "offsite backup contract gate OK"
