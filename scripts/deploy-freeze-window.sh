#!/usr/bin/env bash
# Production deploy freeze window guard.
#
# Operations agreed a nightly pause: no production-affecting action (deploy,
# container refresh, migration) between 00:00 and 04:00 America/Mexico_City,
# when local traffic is lowest but on-call coverage is thinnest.
#
# Usage:
#   scripts/deploy-freeze-window.sh            # 0 = clear, 10 = frozen
#   scripts/deploy-freeze-window.sh --quiet    # exit code only
#   scripts/deploy-freeze-window.sh --at 2026-09-11T02:30:00   # deterministic check
#   scripts/deploy-freeze-window.sh --json
#
# Environment:
#   MERC_DEPLOY_FREEZE_TZ     default America/Mexico_City
#   MERC_DEPLOY_FREEZE_START  default 0000 (HHMM)
#   MERC_DEPLOY_FREEZE_END    default 0400 (HHMM)
set -euo pipefail

FREEZE_TZ="${MERC_DEPLOY_FREEZE_TZ:-America/Mexico_City}"
FREEZE_START="${MERC_DEPLOY_FREEZE_START:-0000}"
FREEZE_END="${MERC_DEPLOY_FREEZE_END:-0400}"
AT=""
JSON_OUTPUT=0
QUIET=0

usage() {
  cat <<'USAGE'
Usage: scripts/deploy-freeze-window.sh [options]

  --at <datetime>   evaluate a specific moment instead of now (interpreted in --tz)
  --tz <zone>       timezone of the window (default America/Mexico_City)
  --start <HHMM>    window start (default 0000)
  --end <HHMM>      window end exclusive (default 0400)
  --json            print a machine-readable summary
  --quiet           no output, exit code only
  -h, --help        show this help

Exit codes: 0 = clear to deploy, 10 = inside the freeze window, 2 = usage error.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --at) AT="${2:?--at requires a value}"; shift 2 ;;
    --tz) FREEZE_TZ="${2:?--tz requires a value}"; shift 2 ;;
    --start) FREEZE_START="${2:?--start requires a value}"; shift 2 ;;
    --end) FREEZE_END="${2:?--end requires a value}"; shift 2 ;;
    --json) JSON_OUTPUT=1; shift ;;
    --quiet) QUIET=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

validate_hhmm() {
  local value="$1" label="$2"
  case "$value" in
    [0-9][0-9][0-9][0-9]) ;;
    *) echo "$label must be HHMM, got '$value'" >&2; exit 2 ;;
  esac
  local hour=$((10#${value:0:2})) minute=$((10#${value:2:2}))
  if [ "$hour" -gt 23 ] || [ "$minute" -gt 59 ]; then
    echo "$label is not a valid time: '$value'" >&2
    exit 2
  fi
}

validate_hhmm "$FREEZE_START" "--start"
validate_hhmm "$FREEZE_END" "--end"

if [ -n "$AT" ]; then
  if ! now_hhmm="$(TZ="$FREEZE_TZ" date -d "$AT" +%H%M 2>/dev/null)"; then
    echo "cannot interpret '$AT' in timezone '$FREEZE_TZ'" >&2
    exit 2
  fi
else
  if ! now_hhmm="$(TZ="$FREEZE_TZ" date +%H%M 2>/dev/null)"; then
    echo "timezone '$FREEZE_TZ' is not available on this host" >&2
    exit 2
  fi
fi

to_minutes() { echo $((10#${1:0:2} * 60 + 10#${1:2:2})); }

now_minutes="$(to_minutes "$now_hhmm")"
start_minutes="$(to_minutes "$FREEZE_START")"
end_minutes="$(to_minutes "$FREEZE_END")"

frozen=0
if [ "$start_minutes" -eq "$end_minutes" ]; then
  frozen=0
elif [ "$start_minutes" -lt "$end_minutes" ]; then
  if [ "$now_minutes" -ge "$start_minutes" ] && [ "$now_minutes" -lt "$end_minutes" ]; then
    frozen=1
  fi
else
  if [ "$now_minutes" -ge "$start_minutes" ] || [ "$now_minutes" -lt "$end_minutes" ]; then
    frozen=1
  fi
fi

window="$(printf '%s-%s' "${FREEZE_START:0:2}:${FREEZE_START:2:2}" "${FREEZE_END:0:2}:${FREEZE_END:2:2}")"
local_now="$(printf '%s:%s' "${now_hhmm:0:2}" "${now_hhmm:2:2}")"

if [ "$JSON_OUTPUT" -eq 1 ]; then
  if [ "$frozen" -eq 1 ]; then status="frozen"; else status="clear"; fi
  printf '{"status":"%s","tz":"%s","window":"%s","local_time":"%s"}\n' \
    "$status" "$FREEZE_TZ" "$window" "$local_now"
fi

if [ "$frozen" -eq 1 ]; then
  if [ "$QUIET" -ne 1 ] && [ "$JSON_OUTPUT" -ne 1 ]; then
    echo "DEPLOY_FREEZE=ACTIVE window=${window} tz=${FREEZE_TZ} local_time=${local_now}"
    echo "Production deploy is paused during the nightly freeze; retry after ${window#*-} ${FREEZE_TZ}." >&2
  fi
  exit 10
fi

if [ "$QUIET" -ne 1 ] && [ "$JSON_OUTPUT" -ne 1 ]; then
  echo "DEPLOY_FREEZE=CLEAR window=${window} tz=${FREEZE_TZ} local_time=${local_now}"
fi

exit 0
