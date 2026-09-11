#!/usr/bin/env bash
# Refuse to start a heavy browser suite when the host is already out of memory.
#
# The self-hosted runner was OOM-killed on 2026-09-10 while several browser
# suites plus leaked Vite servers competed for RAM. This preflight makes that
# failure mode explicit and cheap to detect before a shard starts.
#
# Usage:
#   scripts/runner-memory-preflight.sh                     # check only
#   scripts/runner-memory-preflight.sh --cleanup           # reap orphans, then check
#   scripts/runner-memory-preflight.sh --wait 120          # wait for memory to free
#   scripts/runner-memory-preflight.sh --min-available-mb 6144
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MEMINFO_FILE="${MERC_MEMINFO_FILE:-/proc/meminfo}"
MIN_AVAILABLE_MB="${MERC_CI_MIN_AVAILABLE_MB:-4096}"
MIN_SWAP_FREE_MB="${MERC_CI_MIN_SWAP_FREE_MB:-0}"
WAIT_SECONDS="${MERC_CI_MEMORY_WAIT_SECONDS:-0}"
RUN_CLEANUP=0
JSON_OUTPUT=0
LABEL="${MERC_CI_MEMORY_LABEL:-runner-memory-preflight}"

usage() {
  cat <<'USAGE'
Usage: scripts/runner-memory-preflight.sh [options]

  --min-available-mb <mb>  required MemAvailable (default 4096)
  --min-swap-free-mb <mb>  required free swap (default 0 = warn only)
  --wait <seconds>         poll until the requirement is met (default 0)
  --cleanup                reap orphaned test processes first
  --label <name>           name used in log lines
  --json                   print a machine-readable summary line
  -h, --help               show this help

Environment: MERC_CI_MIN_AVAILABLE_MB, MERC_CI_MIN_SWAP_FREE_MB,
MERC_CI_MEMORY_WAIT_SECONDS, MERC_CI_MEMORY_LABEL, MERC_MEMINFO_FILE.
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --min-available-mb) MIN_AVAILABLE_MB="${2:?--min-available-mb requires a value}"; shift 2 ;;
    --min-swap-free-mb) MIN_SWAP_FREE_MB="${2:?--min-swap-free-mb requires a value}"; shift 2 ;;
    --wait) WAIT_SECONDS="${2:?--wait requires a value}"; shift 2 ;;
    --cleanup) RUN_CLEANUP=1; shift ;;
    --label) LABEL="${2:?--label requires a value}"; shift 2 ;;
    --json) JSON_OUTPUT=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

for value_name in MIN_AVAILABLE_MB MIN_SWAP_FREE_MB WAIT_SECONDS; do
  value="${!value_name}"
  case "$value" in
    ''|*[!0-9]*) echo "$value_name must be a non-negative integer, got '$value'" >&2; exit 2 ;;
  esac
done

if [ ! -r "$MEMINFO_FILE" ]; then
  echo "cannot read $MEMINFO_FILE" >&2
  exit 2
fi

read_meminfo() {
  awk '
    /^MemAvailable:/ { available = $2 }
    /^MemFree:/      { free = $2 }
    /^Buffers:/      { buffers = $2 }
    /^Cached:/       { cached = $2 }
    /^SwapFree:/     { swap_free = $2 }
    /^SwapTotal:/    { swap_total = $2 }
    END {
      if (available == "") {
        available = free + buffers + cached
      }
      printf "%d %d %d\n", available / 1024, swap_free / 1024, swap_total / 1024
    }
  ' "$MEMINFO_FILE"
}

if [ "$RUN_CLEANUP" -eq 1 ] && [ -x "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" ]; then
  echo "[$LABEL] reaping orphaned test processes before the memory check"
  APPLY_FLAG="--apply"
  if [ "${MERC_CI_CLEANUP_DRY_RUN:-0}" = "1" ]; then
    APPLY_FLAG=""
  fi
  # shellcheck disable=SC2086
  bash "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" --scope mercasto $APPLY_FLAG || true
fi

deadline=$(( $(date +%s) + WAIT_SECONDS ))
attempt=1
while :; do
  read -r available_mb swap_free_mb swap_total_mb <<<"$(read_meminfo)"

  if [ "$available_mb" -ge "$MIN_AVAILABLE_MB" ]; then
    if [ "$swap_total_mb" -gt 0 ] && [ "$swap_free_mb" -lt "$MIN_SWAP_FREE_MB" ]; then
      echo "[$LABEL] warning: swap free ${swap_free_mb}MB is below ${MIN_SWAP_FREE_MB}MB; swap exhaustion amplifies OOM risk"
    fi
    echo "[$LABEL] RUNNER_MEMORY_PREFLIGHT=OK available_mb=${available_mb} required_mb=${MIN_AVAILABLE_MB} swap_free_mb=${swap_free_mb}"
    if [ "$JSON_OUTPUT" -eq 1 ]; then
      printf '{"status":"ok","available_mb":%s,"required_mb":%s,"swap_free_mb":%s,"attempts":%s}\n' \
        "$available_mb" "$MIN_AVAILABLE_MB" "$swap_free_mb" "$attempt"
    fi
    exit 0
  fi

  if [ "$(date +%s)" -ge "$deadline" ]; then
    message="[$LABEL] RUNNER_MEMORY_PREFLIGHT=FAIL available_mb=${available_mb} required_mb=${MIN_AVAILABLE_MB} swap_free_mb=${swap_free_mb}"
    echo "$message" >&2
    if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
      echo "::error::Insufficient memory for a heavy browser suite: ${available_mb}MB available, ${MIN_AVAILABLE_MB}MB required. Reap orphaned Vite/Playwright processes (scripts/runner-orphan-cleanup.sh --apply) or lower parallelism before retrying."
    fi
    if [ "$JSON_OUTPUT" -eq 1 ]; then
      printf '{"status":"fail","available_mb":%s,"required_mb":%s,"swap_free_mb":%s,"attempts":%s}\n' \
        "$available_mb" "$MIN_AVAILABLE_MB" "$swap_free_mb" "$attempt"
    fi
    exit 1
  fi

  echo "[$LABEL] waiting for memory: ${available_mb}MB available, ${MIN_AVAILABLE_MB}MB required (attempt ${attempt})"
  sleep 5
  attempt=$((attempt + 1))
done
