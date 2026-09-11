#!/usr/bin/env bash
# Restart a self-hosted GitHub Actions runner without killing in-flight jobs.
#
# Restarting a runner cancels whatever job it is executing: the listener receives
# a shutdown signal and reports "The runner has received a shutdown signal" in
# the job log. On 2026-09-11 that happened twice by hand (06:32 and 14:29 UTC)
# and killed unrelated CI jobs, including a merge-gate run and a 20-minute
# Android build.
#
# This helper waits until the repositories the runner serves have no queued or
# running workflow runs, then restarts the unit. Use --dry-run to only report.
#
# Usage:
#   scripts/runner-safe-restart.sh --unit actions.runner.<owner>-<repo>.<host>.service
#   scripts/runner-safe-restart.sh --unit <unit> --wait 900 --apply
#   scripts/runner-safe-restart.sh --unit <unit> --force --apply
set -euo pipefail

UNIT=""
REPOS="johnslimg-alt/mercasto johnslimg-alt/mercasto-mobile"
WAIT_SECONDS=900
POLL_SECONDS=30
APPLY=0
FORCE=0
DRY_RUN=1

usage() {
  cat <<'USAGE'
Usage: scripts/runner-safe-restart.sh --unit <systemd unit> [options]

  --unit <unit>       runner unit to restart (required)
  --repos "<a/b c/d>" repositories to watch (default: mercasto + mercasto-mobile)
  --wait <seconds>    how long to wait for idle (default 900)
  --poll <seconds>    poll interval (default 30)
  --apply             actually restart (default: report only)
  --force             restart immediately even if work is running
  -h, --help          show this help

Exit codes: 0 restarted (or reported), 1 still busy after the wait, 2 usage error.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --unit) UNIT="${2:?--unit requires a value}"; shift 2 ;;
    --repos) REPOS="${2:?--repos requires a value}"; shift 2 ;;
    --wait) WAIT_SECONDS="${2:?--wait requires a value}"; shift 2 ;;
    --poll) POLL_SECONDS="${2:?--poll requires a value}"; shift 2 ;;
    --apply) APPLY=1; DRY_RUN=0; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[ -n "$UNIT" ] || { echo "--unit is required" >&2; usage >&2; exit 2; }
command -v gh >/dev/null 2>&1 || { echo "gh is required" >&2; exit 2; }

busy_runs() {
  local total=0
  for repo in $REPOS; do
    local count
    count="$(gh run list --repo "$repo" --limit 100 --json status \
      --jq '[.[] | select(.status == "in_progress" or .status == "queued")] | length' 2>/dev/null || echo 0)"
    case "$count" in ''|*[!0-9]*) count=0 ;; esac
    if [ "$count" -gt 0 ]; then
      printf '%s=%s ' "$repo" "$count"
    fi
    total=$((total + count))
  done
  printf '%s\n' "$total"
}

describe_busy() {
  for repo in $REPOS; do
    gh run list --repo "$repo" --limit 100 --json name,status,headBranch \
      --jq --arg repo "$repo" '.[] | select(.status == "in_progress" or .status == "queued") | "  \($repo) \(.status) \(.headBranch) \(.name)"' 2>/dev/null || true
  done
}

echo "== Runner safe restart =="
echo "unit:  $UNIT"
echo "repos: $REPOS"

if [ "$FORCE" -eq 1 ]; then
  echo "forced: skipping the idle wait"
else
  deadline=$(( $(date +%s) + WAIT_SECONDS ))
  while :; do
    summary="$(busy_runs)"
    total="${summary##* }"
    if [ "$total" -eq 0 ]; then
      echo "no queued or running runs; safe to restart"
      break
    fi
    if [ "$(date +%s)" -ge "$deadline" ]; then
      echo "still busy after ${WAIT_SECONDS}s (${summary}); refusing to restart" >&2
      describe_busy >&2
      exit 1
    fi
    echo "waiting: ${summary}(runs) still active"
    sleep "$POLL_SECONDS"
  done
fi

if [ "$APPLY" -ne 1 ]; then
  echo "DRY-RUN: systemctl restart $UNIT"
  echo "re-run with --apply to restart"
  exit 0
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "--apply requires root" >&2
  exit 2
fi

systemctl restart "$UNIT"
sleep 3
printf 'unit state: %s\n' "$(systemctl is-active "$UNIT" 2>/dev/null || echo unknown)"
echo "RUNNER_SAFE_RESTART=OK unit=$UNIT"
