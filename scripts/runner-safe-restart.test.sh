#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-runner-safe-restart-test.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

export BUSY_STATE_FILE="$TMP/busy-count"
echo "2" >"$BUSY_STATE_FILE"

cat >"$TMP/gh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
# Minimal `gh run list` mock: prints the busy count from BUSY_STATE_FILE.
if [[ "${1:-}" == "run" && "${2:-}" == "list" ]]; then
  cat "$BUSY_STATE_FILE"
  exit 0
fi
echo "unexpected gh invocation: $*" >&2
exit 2
MOCK
chmod +x "$TMP/gh"

script="$ROOT_DIR/scripts/runner-safe-restart.sh"

echo "== runner-safe-restart tests =="

# 1. Busy forever must refuse to restart.
echo "3" >"$BUSY_STATE_FILE"
set +e
PATH="$TMP:$PATH" bash "$script" --unit test-runner.service --wait 2 --poll 1 >"$TMP/refuse.log" 2>&1
refuse_status=$?
set -e
if [ "$refuse_status" -ne 1 ]; then
  echo "expected exit 1 while busy, got $refuse_status" >&2
  cat "$TMP/refuse.log" >&2
  exit 1
fi
grep -q "refusing to restart" "$TMP/refuse.log"

# 2. Idle repositories: report and do not restart without --apply.
echo "0" >"$BUSY_STATE_FILE"
PATH="$TMP:$PATH" bash "$script" --unit test-runner.service --wait 2 --poll 1 >"$TMP/dry.log" 2>&1
grep -q "safe to restart" "$TMP/dry.log"
grep -q "DRY-RUN: systemctl restart test-runner.service" "$TMP/dry.log"

# 3. Idle again but work exists on the first poll and stops later.
echo "1" >"$TMP/poll-count"
cat >"$TMP/gh" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == "run" && "${2:-}" == "list" ]]; then
  count="$(cat "$BUSY_STATE_FILE")"
  echo "0" >"$BUSY_STATE_FILE"
  for arg in "$@"; do
    if [[ "$arg" == *"length"* ]]; then
      echo "$count"
      exit 0
    fi
  done
  exit 0
fi
exit 2
MOCK
chmod +x "$TMP/gh"
echo "1" >"$BUSY_STATE_FILE"
PATH="$TMP:$PATH" bash "$script" --unit test-runner.service --wait 5 --poll 1 >"$TMP/wait.log" 2>&1
grep -q "waiting" "$TMP/wait.log"
grep -q "safe to restart" "$TMP/wait.log"

# 4. --force skips the wait entirely.
echo "5" >"$BUSY_STATE_FILE"
PATH="$TMP:$PATH" bash "$script" --unit test-runner.service --force >"$TMP/force.log" 2>&1
grep -q "forced: skipping the idle wait" "$TMP/force.log"
grep -q "DRY-RUN" "$TMP/force.log"

# 5. Missing --unit is a usage error.
set +e
PATH="$TMP:$PATH" bash "$script" >/dev/null 2>&1
usage_status=$?
set -e
if [ "$usage_status" -ne 2 ]; then
  echo "expected exit 2 without --unit, got $usage_status" >&2
  exit 1
fi

echo "runner-safe-restart tests OK"
