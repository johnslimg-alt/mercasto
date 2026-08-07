#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WATCH="$ROOT_DIR/scripts/internal-service-exposure-watch.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"

cat > "$TMP/bin/ss" <<'FAKE'
#!/usr/bin/env bash
case "${WATCH_SCENARIO:-safe}" in
  wildcard) echo 'LISTEN 0 4096 *:11434 *:*' ;;
  *) echo 'LISTEN 0 200 127.0.0.1:5432 0.0.0.0:*' ;;
esac
FAKE

cat > "$TMP/bin/docker" <<'FAKE'
#!/usr/bin/env bash
scenario="${WATCH_SCENARIO:-safe}"
if [[ "$1 $2" == "ps -q" ]]; then
  [[ "$scenario" == "hostnet" ]] && echo abc123
  exit 0
fi
if [[ "$1" == "inspect" ]]; then
  echo '/rogue host'
  exit 0
fi
if [[ "$1" == "ps" && "$2" == "--format" ]]; then
  [[ "$scenario" == "published" ]] && echo 'rogue 0.0.0.0:11434->11434/tcp'
  exit 0
fi
exit 0
FAKE
chmod +x "$TMP/bin/ss" "$TMP/bin/docker"

run_case() {
  local scenario="$1" expected="$2"
  set +e
  WATCH_SCENARIO="$scenario" PATH="$TMP/bin:$PATH" bash "$WATCH" >"$TMP/$scenario.out" 2>&1
  local rc=$?
  set -e
  if [[ "$expected" == pass && $rc -ne 0 ]]; then cat "$TMP/$scenario.out"; exit 1; fi
  if [[ "$expected" == fail && $rc -eq 0 ]]; then cat "$TMP/$scenario.out"; exit 1; fi
}

run_case safe pass
run_case wildcard fail
run_case hostnet fail
run_case published fail

echo "internal service exposure watch fixture tests OK"
