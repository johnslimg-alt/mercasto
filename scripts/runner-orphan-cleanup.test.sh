#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-orphan-cleanup-test.XXXXXX")"
FIXTURE_PIDS=()

cleanup() {
  for pid in "${FIXTURE_PIDS[@]:-}"; do
    [ -n "$pid" ] || continue
    kill -KILL "$pid" 2>/dev/null || true
  done
  rm -rf "$TMP"
}
trap cleanup EXIT

spawn_orphan() {
  local tag="$1"
  local bindir="$TMP/mercasto-orphan-fixture-${tag}/node_modules/.bin"
  mkdir -p "$bindir"
  cat >"$bindir/vite" <<'SCRIPT'
#!/usr/bin/env bash
sleep 900
SCRIPT
  chmod +x "$bindir/vite"

  # setsid --fork reparents the fixture to init, exactly like a leaked CI server.
  setsid --fork "$bindir/vite" preview --host 127.0.0.1 --port "$((6100 + tag))" --strictPort \
    >/dev/null 2>&1 || true

  local pid=""
  for _ in $(seq 1 30); do
    pid="$(pgrep -f "mercasto-orphan-fixture-${tag}/node_modules/.bin/vite preview" | head -1 || true)"
    if [ -n "$pid" ]; then
      break
    fi
    sleep 0.2
  done
  if [ -z "$pid" ]; then
    echo "failed to spawn the orphan fixture" >&2
    exit 1
  fi
  FIXTURE_PIDS+=("$pid")
  printf '%s\n' "$pid"
}

echo "== runner-orphan-cleanup tests =="

fixture_pid="$(spawn_orphan 1)"

# 1. The age gate must leave a young process alone.
young_output="$(bash "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" --pids "$fixture_pid" --json)"
case "$young_output" in
  *'"candidates":0'*) ;;
  *) echo "young process was treated as an orphan: $young_output" >&2; exit 1 ;;
esac
kill -0 "$fixture_pid"

# 2. With the age gate relaxed the fixture is detected and reported.
detect_output="$(bash "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" \
  --pids "$fixture_pid" --max-age 0 --ignore-active-jobs --json)"
case "$detect_output" in
  *'"candidates":1'*) ;;
  *) echo "fixture was not detected as an orphan: $detect_output" >&2; exit 1 ;;
esac

# 3. Audit mode reports orphans through the exit code.
set +e
bash "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" \
  --pids "$fixture_pid" --max-age 0 --ignore-active-jobs --fail-on-orphans >/dev/null
audit_status=$?
set -e
if [ "$audit_status" -ne 3 ]; then
  echo "expected exit 3 from --fail-on-orphans, got $audit_status" >&2
  exit 1
fi

# 4. Dry-run must not signal anything.
if ! kill -0 "$fixture_pid" 2>/dev/null; then
  echo "dry-run terminated the fixture" >&2
  exit 1
fi

# 5. --apply terminates the orphan.
bash "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" \
  --pids "$fixture_pid" --max-age 0 --ignore-active-jobs --apply >/dev/null
if kill -0 "$fixture_pid" 2>/dev/null; then
  echo "orphan survived --apply" >&2
  exit 1
fi

# 6. The current process tree is never a candidate.
self_output="$(bash "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" \
  --pids "$$" --max-age 0 --ignore-active-jobs --json)"
case "$self_output" in
  *'"candidates":0'*) ;;
  *) echo "cleanup considered its own process tree: $self_output" >&2; exit 1 ;;
esac

# 7. Runner infrastructure is out of scope even when it matches the runtime class.
infra_output="$(bash "$ROOT_DIR/scripts/runner-orphan-cleanup.sh" \
  --pids "1" --max-age 0 --ignore-active-jobs --json)"
case "$infra_output" in
  *'"candidates":0'*) ;;
  *) echo "cleanup considered PID 1: $infra_output" >&2; exit 1 ;;
esac

echo "runner-orphan-cleanup tests OK"
