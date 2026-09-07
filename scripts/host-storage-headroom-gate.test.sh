#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HELPER="$ROOT/scripts/host-storage-headroom-gate.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/df" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
use="${TEST_ROOT_USE:?}"
total=100000
used=$((use * 1000))
avail=$((total - used))
printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\n'
printf '/dev/test %d %d %d %d%% /\n' "$total" "$used" "$avail" "$use"
SH
chmod +x "$TMP/df"

run_case() {
  local use="$1" expected_rc="$2" expected_text="$3"
  local out rc=0
  out="$(PATH="$TMP:$PATH" TEST_ROOT_USE="$use" bash "$HELPER" 2>&1)" || rc=$?
  if [ "$rc" -ne "$expected_rc" ]; then
    echo "unexpected rc=$rc for use=$use" >&2
    echo "$out" >&2
    exit 1
  fi
  if [ -n "$expected_text" ] && ! grep -qF "$expected_text" <<<"$out"; then
    echo "missing expected text for use=$use: $expected_text" >&2
    echo "$out" >&2
    exit 1
  fi
}

run_case 79 0 'root_filesystem_usage=79%'
run_case 80 0 'WARNING: root filesystem usage is 80%'
run_case 89 0 'WARNING: root filesystem usage is 89%'
run_case 90 1 'FAIL: root filesystem usage is 90%'

rc=0
PATH="$TMP:$PATH" TEST_ROOT_USE=50 HOST_STORAGE_WARN_PERCENT=95 HOST_STORAGE_FAIL_PERCENT=90 \
  bash "$HELPER" >/tmp/mercasto-storage-threshold-test.out 2>&1 || rc=$?
if [ "$rc" -ne 2 ]; then
  echo "invalid threshold configuration must fail with rc=2" >&2
  exit 1
fi

echo "host storage headroom gate tests OK"
