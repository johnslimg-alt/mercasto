#!/usr/bin/env bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/var/www/mercasto/postgres-backups}"
MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-30}"
REQUIRE_BACKUP_FRESHNESS="${REQUIRE_BACKUP_FRESHNESS:-0}"

now="$(date +%s)"
max_age_seconds="$((MAX_BACKUP_AGE_HOURS * 3600))"

echo "== Backup freshness smoke =="
echo "backup_root=$BACKUP_ROOT"
echo "max_backup_age_hours=$MAX_BACKUP_AGE_HOURS"

if [[ ! -d "$BACKUP_ROOT" ]]; then
  echo "backup_root_status=missing"
  if [[ "$REQUIRE_BACKUP_FRESHNESS" == "1" ]]; then
    echo "FAIL: backup root is missing" >&2
    exit 1
  fi
  echo "backup freshness smoke skipped"
  exit 0
fi

latest="$(find "$BACKUP_ROOT" -type f \( -name '*.sql' -o -name '*.dump' -o -name '*.backup' -o -name '*.gz' -o -name '*.zst' \) -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2- || true)"

if [[ -z "$latest" ]]; then
  echo "backup_file_status=missing"
  if [[ "$REQUIRE_BACKUP_FRESHNESS" == "1" ]]; then
    echo "FAIL: no database backup artifact found" >&2
    exit 1
  fi
  echo "backup freshness smoke skipped"
  exit 0
fi

mtime="$(stat -c %Y "$latest")"
age_seconds="$((now - mtime))"
age_hours="$((age_seconds / 3600))"
size_bytes="$(stat -c %s "$latest")"

echo "latest_backup=$(basename "$latest")"
echo "latest_backup_age_hours=$age_hours"
echo "latest_backup_size_bytes=$size_bytes"

if (( size_bytes <= 0 )); then
  echo "FAIL: latest backup is empty" >&2
  exit 1
fi

if (( age_seconds > max_age_seconds )); then
  echo "backup_freshness=stale"
  if [[ "$REQUIRE_BACKUP_FRESHNESS" == "1" ]]; then
    echo "FAIL: latest backup is older than ${MAX_BACKUP_AGE_HOURS}h" >&2
    exit 1
  fi
else
  echo "backup_freshness=ready"
fi

echo "backup freshness smoke OK"
