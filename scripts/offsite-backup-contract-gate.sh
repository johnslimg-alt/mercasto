#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BACKUP="ops/backups/mercasto-offsite-backup.py"
SMOKE="scripts/offsite-backup-smoke.sh"
SERVER="scripts/server-operator.sh"
for f in "$BACKUP" "$SMOKE" ops/systemd/mercasto-offsite-backup.service \
  ops/systemd/mercasto-offsite-backup.timer ops/systemd/mercasto-offsite-backup-alert.service \
  ops/systemd/mercasto-offsite-restore-drill.service ops/systemd/mercasto-offsite-restore-drill.timer; do
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
grep -qF "bash scripts/offsite-backup-smoke.sh" "$SERVER"
grep -qF 'run_root test -x "$STATUS_BIN"' "$SMOKE"
if grep -qE '^test -x "\$STATUS_BIN"$' "$SMOKE"; then
  echo "FAIL: offsite smoke checks the root-only status binary without run_root" >&2
  exit 1
fi
if grep -RIEq --exclude=offsite-backup-contract-gate.sh 'AWS_SECRET_ACCESS_KEY=[A-Za-z0-9_/+=-]{16,}|R2_[A-Z_]*SECRET=[A-Za-z0-9_/+=-]{16,}' ops scripts docs; then
  echo "FAIL: possible offsite-backup secret committed" >&2
  exit 1
fi
echo "offsite backup contract gate OK"
