#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

expect_exit() {
  local expected="$1" description="$2"
  shift 2
  set +e
  "$@" >/dev/null 2>&1
  local status=$?
  set -e
  if [ "$status" -ne "$expected" ]; then
    echo "${description}: expected exit ${expected}, got ${status}" >&2
    exit 1
  fi
}

echo "== deploy-freeze-window tests =="

script="$ROOT_DIR/scripts/deploy-freeze-window.sh"

# America/Mexico_City, default window 00:00-04:00.
expect_exit 10 "02:30 local must be frozen" bash "$script" --at 2026-09-11T02:30:00
expect_exit 10 "00:00 local is the inclusive start" bash "$script" --at 2026-09-11T00:00:00
expect_exit 0 "04:00 local is the exclusive end" bash "$script" --at 2026-09-11T04:00:00
expect_exit 0 "12:00 local is clear" bash "$script" --at 2026-09-11T12:00:00
expect_exit 0 "23:59 local is clear" bash "$script" --at 2026-09-11T23:59:00

# A window that wraps midnight.
expect_exit 10 "wrapping window inside" bash "$script" \
  --start 2200 --end 0400 --at 2026-09-11T23:30:00
expect_exit 10 "wrapping window after midnight" bash "$script" \
  --start 2200 --end 0400 --at 2026-09-11T01:00:00
expect_exit 0 "wrapping window outside" bash "$script" \
  --start 2200 --end 0400 --at 2026-09-11T12:00:00

# Invalid input is a usage error, never a silent pass.
expect_exit 2 "invalid --start" bash "$script" --start 9999 --at 2026-09-11T12:00:00
expect_exit 2 "invalid --at" bash "$script" --at not-a-date

output="$(bash "$script" --at 2026-09-11T02:30:00 --json || true)"
case "$output" in
  *'"status":"frozen"'*) ;;
  *) echo "expected a frozen JSON status, got: $output" >&2; exit 1 ;;
esac

output="$(bash "$script" --at 2026-09-11T12:00:00 --json)"
case "$output" in
  *'"status":"clear"'*) ;;
  *) echo "expected a clear JSON status, got: $output" >&2; exit 1 ;;
esac

# The default window must match the agreed operations pause.
grep -qF 'MERC_DEPLOY_FREEZE_TZ:-America/Mexico_City' "$script"
grep -qF 'MERC_DEPLOY_FREEZE_START:-0000' "$script"
grep -qF 'MERC_DEPLOY_FREEZE_END:-0400' "$script"

echo "deploy-freeze-window tests OK"
