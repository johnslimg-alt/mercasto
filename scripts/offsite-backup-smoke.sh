#!/usr/bin/env bash
set -euo pipefail

STATUS_BIN="${OFFSITE_BACKUP_STATUS_BIN:-/usr/local/sbin/mercasto-offsite-backup}"
STATE_ROOT="${OFFSITE_BACKUP_STATE_ROOT:-/var/lib/mercasto-offsite-backup}"
MAX_RESTORE_AGE_DAYS="${MAX_OFFSITE_RESTORE_AGE_DAYS:-35}"

run_root() {
  if [[ "$(id -u)" -eq 0 ]]; then "$@"; else sudo -n "$@"; fi
}

echo "== Off-host PostgreSQL backup smoke =="
test -x "$STATUS_BIN"
run_root systemctl is-enabled --quiet mercasto-offsite-backup.timer
run_root systemctl is-active --quiet mercasto-offsite-backup.timer
run_root systemctl is-enabled --quiet mercasto-offsite-restore-drill.timer
run_root systemctl is-active --quiet mercasto-offsite-restore-drill.timer
if run_root test -e "$STATE_ROOT/FAILED"; then
  echo "FAIL: off-host backup failure marker present" >&2
  exit 1
fi
status="$(run_root "$STATUS_BIN" --status)"
grep -qF 'offsite_backup=ready' <<<"$status"
grep -qF 'restore_drill=success' <<<"$status"
completed="$(run_root jq -r '.last_restore_drill.completed_at_utc // empty' "$STATE_ROOT/state.json")"
test -n "$completed"
now="$(date +%s)"
then="$(date -d "$completed" +%s)"
age_days="$(( (now - then) / 86400 ))"
if (( age_days > MAX_RESTORE_AGE_DAYS )); then
  echo "FAIL: last remote restore drill is ${age_days} days old" >&2
  exit 1
fi
echo "$status"
echo "last_restore_drill_age_days=$age_days"
echo "off-host PostgreSQL backup smoke OK"
