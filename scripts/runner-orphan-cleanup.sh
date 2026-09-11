#!/usr/bin/env bash
# Reap orphaned Mercasto test processes: Vite preview/dev servers, Vite build
# watchers, Playwright workers and CI browser processes that outlived the job or
# agent session that started them.
#
# Incident: on 2026-09-10 the self-hosted runner was killed by the Linux OOM
# killer after dozens of forgotten Vite processes accumulated ~11.6 GiB RSS.
# Nothing in the repository reaped them, so every abandoned scratch worktree
# leaked memory until the host ran out.
#
# Safety model (defaults are conservative):
#   * dry-run unless --apply is passed
#   * only command lines that look like a test runtime
#   * only processes inside the selected scope (default: mercasto-owned paths)
#   * only processes older than --max-age (default 1800s)
#   * never the runner itself, the current process tree, PID 1, container/DB/AI
#     infrastructure, or anything that may belong to a still-running CI job
#
# Usage:
#   scripts/runner-orphan-cleanup.sh                     # report only
#   scripts/runner-orphan-cleanup.sh --apply             # terminate orphans
#   scripts/runner-orphan-cleanup.sh --apply --json
#   scripts/runner-orphan-cleanup.sh --pids "123 456" --apply
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

APPLY=0
SCOPE="${MERC_RUNNER_ORPHAN_SCOPE:-mercasto}"
MAX_AGE_SECONDS="${MERC_RUNNER_ORPHAN_MAX_AGE_SECONDS:-1800}"
TERM_GRACE_SECONDS="${MERC_RUNNER_ORPHAN_TERM_GRACE_SECONDS:-10}"
LOG_FILE="${MERC_RUNNER_ORPHAN_LOG:-}"
JSON_OUTPUT=0
FAIL_ON_ORPHANS=0
IGNORE_ACTIVE_JOBS="${MERC_RUNNER_ORPHAN_IGNORE_ACTIVE_JOBS:-0}"
IGNORE_LIVE_TEST_DRIVERS="${MERC_RUNNER_ORPHAN_IGNORE_TEST_DRIVERS:-0}"
TARGET_PIDS="${MERC_RUNNER_ORPHAN_PIDS:-}"

usage() {
  cat <<'USAGE'
Usage: scripts/runner-orphan-cleanup.sh [options]

  --apply                 actually signal the orphans (default: report only)
  --scope <mercasto|all>  which command lines to consider (default: mercasto)
  --max-age <seconds>     minimum process age to be considered (default: 1800)
  --pids "<pids>"         only consider these PIDs (operator/tests escape hatch)
  --ignore-active-jobs    do not skip processes started after a live CI job began
  --ignore-live-test-drivers
                          do not skip servers that still have a live Playwright
                          driver in their ancestry (finish current sessions)
  --json                  print a machine-readable summary line
  --fail-on-orphans       exit 3 when orphans were found (audit mode)
  --log <file>            append the report to a log file
  -h, --help              show this help

Environment:
  MERC_RUNNER_ORPHAN_MAX_AGE_SECONDS, MERC_RUNNER_ORPHAN_SCOPE,
  MERC_RUNNER_ORPHAN_TERM_GRACE_SECONDS, MERC_RUNNER_ORPHAN_PIDS,
  MERC_RUNNER_ORPHAN_LOG
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --apply) APPLY=1; shift ;;
    --json) JSON_OUTPUT=1; shift ;;
    --fail-on-orphans) FAIL_ON_ORPHANS=1; shift ;;
    --ignore-active-jobs) IGNORE_ACTIVE_JOBS=1; shift ;;
    --ignore-live-test-drivers) IGNORE_LIVE_TEST_DRIVERS=1; shift ;;
    --scope) SCOPE="${2:?--scope requires a value}"; shift 2 ;;
    --max-age) MAX_AGE_SECONDS="${2:?--max-age requires a value}"; shift 2 ;;
    --term-grace) TERM_GRACE_SECONDS="${2:?--term-grace requires a value}"; shift 2 ;;
    --pids) TARGET_PIDS="${2:?--pids requires a value}"; shift 2 ;;
    --log) LOG_FILE="${2:?--log requires a value}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$SCOPE" in
  mercasto|all) ;;
  *) echo "unsupported --scope: $SCOPE" >&2; exit 2 ;;
esac

for value_name in MAX_AGE_SECONDS TERM_GRACE_SECONDS; do
  value="${!value_name}"
  case "$value" in
    ''|*[!0-9]*) echo "$value_name must be a non-negative integer, got '$value'" >&2; exit 2 ;;
  esac
done

if [ ! -r /proc/self/stat ]; then
  echo "runner-orphan-cleanup requires a Linux /proc filesystem" >&2
  exit 2
fi

NOW_EPOCH="$(date +%s)"

declare -A PPID_OF=() AGE_OF=() RSS_OF=() CMD_OF=()

while read -r pid ppid etimes rss args; do
  [ -n "${pid:-}" ] || continue
  case "$pid" in *[!0-9]*) continue ;; esac
  PPID_OF["$pid"]="$ppid"
  AGE_OF["$pid"]="$etimes"
  RSS_OF["$pid"]="$rss"
  CMD_OF["$pid"]="${args:-}"
done < <(ps -eww -o pid=,ppid=,etimes=,rss=,args= 2>/dev/null || true)

if [ "${#CMD_OF[@]}" -eq 0 ]; then
  echo "could not read the process table (ps returned nothing)" >&2
  exit 2
fi

# Never signal ourselves or any of our own ancestors.
declare -A PROTECTED_PID=()
probe="$$"
for _ in $(seq 1 40); do
  PROTECTED_PID["$probe"]=1
  probe="${PPID_OF[$probe]:-1}"
  case "$probe" in ''|*[!0-9]*) break ;; esac
  if [ "$probe" = "0" ] || [ "$probe" = "1" ]; then
    PROTECTED_PID["1"]=1
    break
  fi
done

is_infra() {
  case "$1" in
    *Runner.Listener*|*Runner.Worker*|*runsvc.sh*|*run-helper.sh*|*actions-runner*) return 0 ;;
    *dockerd*|*containerd*|*docker-proxy*|*postgres*|*redis-server*|*nginx*|*php-fpm*) return 0 ;;
    *ollama*|*llama-server*|*uvicorn*|*dsh\ web*|*deepseek-harness*) return 0 ;;
    *systemd*|*dbus-daemon*|*sshd*|*cron*) return 0 ;;
  esac
  return 1
}

is_test_runtime() {
  case "$1" in
    *.bin/vite*|*vite\ preview*|*vite\ --host*|*vite\ --port*|*vite.hybrid.config*|*vite-node*) return 0 ;;
    *playwright/lib/worker/workerProcessEntry.js*|*ms-playwright*|*chrome-headless-shell*) return 0 ;;
  esac
  return 1
}

# A Vite server that still has a live Playwright driver in its ancestry belongs
# to a test session that has not finished yet, however old it is.
has_live_test_driver_ancestor() {
  local pid="$1" hop=0 parent
  parent="${PPID_OF[$pid]:-1}"
  while [ -n "$parent" ] && [ "$parent" != "1" ] && [ "$parent" != "0" ] && [ "$hop" -lt 40 ]; do
    case "${CMD_OF[$parent]:-}" in
      *playwright*|*ms-playwright*) return 0 ;;
    esac
    parent="${PPID_OF[$parent]:-1}"
    hop=$((hop + 1))
  done
  return 1
}

scope_match() {
  local cmd="$1" cwd="$2"
  if [ "$SCOPE" = "all" ]; then
    return 0
  fi
  case "$cmd" in
    *mercasto*|*mc-design*) return 0 ;;
  esac
  case "$cwd" in
    *mercasto*|*mc-design*) return 0 ;;
  esac
  return 1
}

# A still-running GitHub Actions job owns every process it started. Anything
# started after that job began is left alone even if it looks reparented.
ACTIVE_JOB_START=""
if [ "$IGNORE_ACTIVE_JOBS" -ne 1 ]; then
  for pid in "${!CMD_OF[@]}"; do
    cmd="${CMD_OF[$pid]}"
    case "$cmd" in
      *Runner.Worker*|*run-helper.sh*)
        started=$((NOW_EPOCH - ${AGE_OF[$pid]:-0}))
        if [ -z "$ACTIVE_JOB_START" ] || [ "$started" -lt "$ACTIVE_JOB_START" ]; then
          ACTIVE_JOB_START="$started"
        fi
        ;;
    esac
  done
fi

CANDIDATES=()
PROTECTED_COUNT=0

consider() {
  local pid="$1"
  local cmd="${CMD_OF[$pid]:-}"
  [ -n "$cmd" ] || return 0
  local age="${AGE_OF[$pid]:-0}"
  local rss="${RSS_OF[$pid]:-0}"

  if [ -n "${PROTECTED_PID[$pid]:-}" ]; then
    return 0
  fi
  if ! is_test_runtime "$cmd"; then
    return 0
  fi
  if is_infra "$cmd"; then
    PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
    return 0
  fi

  local cwd=""
  cwd="$(readlink -f "/proc/$pid/cwd" 2>/dev/null || true)"
  if ! scope_match "$cmd" "$cwd"; then
    return 0
  fi
  if [ "$age" -lt "$MAX_AGE_SECONDS" ]; then
    PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
    return 0
  fi
  if [ "$IGNORE_LIVE_TEST_DRIVERS" -ne 1 ] && has_live_test_driver_ancestor "$pid"; then
    PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
    return 0
  fi
  if [ -n "$ACTIVE_JOB_START" ]; then
    local started=$((NOW_EPOCH - age))
    if [ "$started" -ge "$((ACTIVE_JOB_START - 60))" ]; then
      PROTECTED_COUNT=$((PROTECTED_COUNT + 1))
      return 0
    fi
  fi

  CANDIDATES+=("$pid")
  return 0
}

if [ -n "$TARGET_PIDS" ]; then
  for pid in $TARGET_PIDS; do
    case "$pid" in
      ''|*[!0-9]*) echo "ignoring non-numeric pid '$pid'" >&2; continue ;;
    esac
    consider "$pid"
  done
else
  for pid in "${!CMD_OF[@]}"; do
    consider "$pid"
  done
fi

kill_tree() {
  local pid="$1" sig="$2" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child" "$sig"
  done
  kill -"$sig" "$pid" 2>/dev/null || true
}
report_lines=()
reclaimable_kb=0
for pid in "${CANDIDATES[@]}"; do
  age="${AGE_OF[$pid]:-0}"
  rss="${RSS_OF[$pid]:-0}"
  reclaimable_kb=$((reclaimable_kb + rss))
  report_lines+=("$(printf 'ORPHAN pid=%s age=%ss rss=%sMB ppid=%s cmd=%s' \
    "$pid" "$age" "$((rss / 1024))" "${PPID_OF[$pid]:-?}" "${CMD_OF[$pid]}")")
done

TERMINATED=()
SURVIVED=()
if [ "$APPLY" -eq 1 ] && [ "${#CANDIDATES[@]}" -gt 0 ]; then
  for pid in "${CANDIDATES[@]}"; do
    kill_tree "$pid" TERM
  done
  for _ in $(seq 1 "$TERM_GRACE_SECONDS"); do
    remaining=0
    for pid in "${CANDIDATES[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        remaining=1
      fi
    done
    [ "$remaining" -eq 1 ] || break
    sleep 1
  done
  for pid in "${CANDIDATES[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill_tree "$pid" KILL
      if kill -0 "$pid" 2>/dev/null; then
        SURVIVED+=("$pid")
      else
        TERMINATED+=("$pid")
      fi
    else
      TERMINATED+=("$pid")
    fi
  done
fi

{
  echo "== Mercasto runner orphan cleanup =="
  echo "mode: $( [ "$APPLY" -eq 1 ] && echo apply || echo dry-run ) scope=${SCOPE} max_age=${MAX_AGE_SECONDS}s"
  echo "process table: ${#CMD_OF[@]} processes, ${#CANDIDATES[@]} orphan candidate(s), ${PROTECTED_COUNT} skipped as active/in-scope-young"
  for line in "${report_lines[@]:-}"; do
    [ -n "$line" ] && echo "$line"
  done
  if [ "$APPLY" -eq 1 ]; then
    echo "terminated: ${#TERMINATED[@]} process(es), survived: ${#SURVIVED[@]}"
  fi
  echo "RUNNER_ORPHAN_CLEANUP=$( [ "${#CANDIDATES[@]}" -eq 0 ] && echo CLEAN || echo FOUND ) candidates=${#CANDIDATES[@]} reclaimable_mb=$((reclaimable_kb / 1024)) applied=${APPLY}"
} | if [ -n "$LOG_FILE" ]; then
      mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
      tee -a "$LOG_FILE"
    else
      cat
    fi

if [ "$JSON_OUTPUT" -eq 1 ]; then
  python3 - "$SCOPE" "$APPLY" "$reclaimable_kb" "${#CANDIDATES[@]}" <<'PY'
import json
import sys

scope, applied, reclaimable_kb, candidates = sys.argv[1:5]
print(json.dumps({
    "scope": scope,
    "applied": applied == "1",
    "candidates": int(candidates),
    "reclaimable_mb": int(reclaimable_kb) // 1024,
}, separators=(",", ":")))
PY
fi

if [ "$FAIL_ON_ORPHANS" -eq 1 ] && [ "${#CANDIDATES[@]}" -gt 0 ]; then
  exit 3
fi

exit 0
