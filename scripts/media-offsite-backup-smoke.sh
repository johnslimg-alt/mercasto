#!/usr/bin/env bash
set -euo pipefail

STATUS_BIN="${MEDIA_OFFSITE_BACKUP_STATUS_BIN:-/usr/local/sbin/mercasto-media-offsite-backup}"
STATE_ROOT="${MEDIA_OFFSITE_BACKUP_STATE_ROOT:-/var/lib/mercasto-media-offsite-backup}"
MAX_RESTORE_AGE_DAYS="${MAX_MEDIA_OFFSITE_RESTORE_AGE_DAYS:-8}"

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then "$@"; else sudo -n "$@"; fi
}

echo "== Off-host media backup smoke =="
run_root test -x "$STATUS_BIN"
run_root systemctl is-enabled --quiet mercasto-media-offsite-backup.timer
run_root systemctl is-active --quiet mercasto-media-offsite-backup.timer
run_root systemctl is-enabled --quiet mercasto-media-offsite-restore-drill.timer
run_root systemctl is-active --quiet mercasto-media-offsite-restore-drill.timer
if run_root test -e "$STATE_ROOT/FAILED"; then
  echo "FAIL: off-host media backup failure marker present" >&2
  exit 1
fi
status="$(run_root "$STATUS_BIN" --status)"
grep -qF 'media_offsite_backup=ready' <<<"$status"
grep -qF 'restore_drill=success' <<<"$status"
completed="$(run_root jq -r '.last_restore_drill.completed_at_utc // empty' "$STATE_ROOT/state.json")"
test -n "$completed"
now="$(date +%s)"
then="$(date -d "$completed" +%s)"
age_days="$(( (now - then) / 86400 ))"
if (( age_days > MAX_RESTORE_AGE_DAYS )); then
  echo "FAIL: last media restore drill is ${age_days} days old" >&2
  exit 1
fi
echo "$status"
echo "last_media_restore_drill_age_days=$age_days"
echo "off-host media backup smoke OK"
