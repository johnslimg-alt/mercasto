#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-memory-preflight-test.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

write_meminfo() {
  local path="$1" available="$2" swap_free="$3" extra="${4:-}"
  {
    echo "MemTotal:       32768000 kB"
    if [ "$available" != "none" ]; then
      echo "MemAvailable:   ${available} kB"
    fi
    echo "MemFree:        2000000 kB"
    echo "Buffers:          100000 kB"
    echo "Cached:          3000000 kB"
    echo "SwapTotal:       4095000 kB"
    echo "SwapFree:       ${swap_free} kB"
    if [ -n "$extra" ]; then
      printf '%s\n' "$extra"
    fi
  } >"$path"
}

echo "== runner-memory-preflight tests =="

# 1. Plenty of memory: pass.
write_meminfo "$TMP/ok.meminfo" 8000000 2048000
output="$(MERC_MEMINFO_FILE="$TMP/ok.meminfo" bash "$ROOT_DIR/scripts/runner-memory-preflight.sh" --min-available-mb 4096)"
case "$output" in
  *RUNNER_MEMORY_PREFLIGHT=OK*) ;;
  *) echo "expected OK preflight, got: $output" >&2; exit 1 ;;
esac

# 2. Exhausted host: fail with a non-zero exit code.
write_meminfo "$TMP/low.meminfo" 100000 0
set +e
MERC_MEMINFO_FILE="$TMP/low.meminfo" bash "$ROOT_DIR/scripts/runner-memory-preflight.sh" \
  --min-available-mb 4096 >/dev/null 2>&1
low_status=$?
set -e
if [ "$low_status" -eq 0 ]; then
  echo "preflight accepted an exhausted host" >&2
  exit 1
fi

# 3. Missing MemAvailable falls back to MemFree+Buffers+Cached.
write_meminfo "$TMP/fallback.meminfo" none 1024000
output="$(MERC_MEMINFO_FILE="$TMP/fallback.meminfo" bash "$ROOT_DIR/scripts/runner-memory-preflight.sh" --min-available-mb 4096)"
case "$output" in
  *RUNNER_MEMORY_PREFLIGHT=OK*) ;;
  *) echo "expected fallback OK preflight, got: $output" >&2; exit 1 ;;
esac

# 4. Swap exhaustion is surfaced as a warning without failing a healthy host.
write_meminfo "$TMP/noswap.meminfo" 8000000 0
output="$(MERC_MEMINFO_FILE="$TMP/noswap.meminfo" bash "$ROOT_DIR/scripts/runner-memory-preflight.sh" \
  --min-available-mb 4096 --min-swap-free-mb 256)"
case "$output" in
  *"warning: swap free"*) ;;
  *) echo "expected a swap warning, got: $output" >&2; exit 1 ;;
esac

# 5. Machine-readable summary.
write_meminfo "$TMP/json.meminfo" 8000000 2048000
output="$(MERC_MEMINFO_FILE="$TMP/json.meminfo" bash "$ROOT_DIR/scripts/runner-memory-preflight.sh" --json)"
case "$output" in
  *'"status":"ok"'*) ;;
  *) echo "expected a JSON status line, got: $output" >&2; exit 1 ;;
esac

# 6. Invalid thresholds are rejected instead of silently passing.
set +e
MERC_MEMINFO_FILE="$TMP/ok.meminfo" bash "$ROOT_DIR/scripts/runner-memory-preflight.sh" \
  --min-available-mb nope >/dev/null 2>&1
bad_status=$?
set -e
if [ "$bad_status" -ne 2 ]; then
  echo "expected exit 2 for an invalid threshold, got $bad_status" >&2
  exit 1
fi

echo "runner-memory-preflight tests OK"
