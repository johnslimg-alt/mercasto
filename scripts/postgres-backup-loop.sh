#!/usr/bin/env bash
set -euo pipefail

umask 0027
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
BACKUP_RETRY_SECONDS="${BACKUP_RETRY_SECONDS:-60}"
DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-mercasto_user}"
DB_NAME="${DB_NAME:-mercasto}"

run_backup() {
  local final tmp
  final="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M).dump"
  tmp="${final}.partial.$$"
  rm -f "$tmp"

  if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -F c -f "$tmp" \
    && [[ -s "$tmp" ]] \
    && pg_restore -l "$tmp" >/dev/null 2>&1; then
    chmod 0640 "$tmp"
    mv -f "$tmp" "$final"
    echo "Backup: $final"
    find "$BACKUP_DIR" -type f -name 'backup_*.dump' -mtime +7 -delete
    return 0
  fi

  rm -f "$tmp"
  echo "Backup failed; no final dump published." >&2
  return 1
}

if [[ "${BACKUP_ONCE:-0}" == "1" ]]; then
  run_backup
  exit $?
fi

while true; do
  if run_backup; then
    sleep "$BACKUP_INTERVAL_SECONDS"
  else
    sleep "$BACKUP_RETRY_SECONDS"
  fi
done
