#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"

cat > "$TMP/bin/ps" <<'EOF'
#!/usr/bin/env bash
cat "${TEST_PS_FILE}"
EOF
cat > "$TMP/bin/docker" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "${TEST_DOCKER_LOG}"
if [ "$1 $2" = "system df" ]; then
  echo "TYPE TOTAL ACTIVE SIZE RECLAIMABLE"
fi
EOF
cat > "$TMP/bin/df" <<'EOF'
#!/usr/bin/env bash
echo "Filesystem Size Used Avail Use% Mounted on"
echo "/dev/test 100G 70G 30G 70% /"
EOF
chmod +x "$TMP/bin/ps" "$TMP/bin/docker" "$TMP/bin/df"

: > "$TMP/ps-idle"
: > "$TMP/docker-idle.log"
PATH="$TMP/bin:$PATH" TEST_PS_FILE="$TMP/ps-idle" TEST_DOCKER_LOG="$TMP/docker-idle.log" CONFIRM=MERCASTO \
  bash "$ROOT/scripts/docker-build-cache-cleanup.sh" >/dev/null
grep -qF "builder prune -af --filter until=24h" "$TMP/docker-idle.log"
if grep -Eq 'system prune|image prune|volume prune|--volumes' "$TMP/docker-idle.log"; then
  echo "unsafe Docker prune surface detected" >&2
  exit 1
fi

printf '123 docker compose build reef-crm\n' > "$TMP/ps-active"
: > "$TMP/docker-active.log"
set +e
PATH="$TMP/bin:$PATH" TEST_PS_FILE="$TMP/ps-active" TEST_DOCKER_LOG="$TMP/docker-active.log" CONFIRM=MERCASTO \
  bash "$ROOT/scripts/docker-build-cache-cleanup.sh" >/dev/null 2>&1
status=$?
set -e
[ "$status" -eq 73 ]
[ ! -s "$TMP/docker-active.log" ]

set +e
PATH="$TMP/bin:$PATH" TEST_PS_FILE="$TMP/ps-idle" TEST_DOCKER_LOG="$TMP/docker-active.log" \
  bash "$ROOT/scripts/docker-build-cache-cleanup.sh" >/dev/null 2>&1
status=$?
set -e
[ "$status" -eq 64 ]

echo "docker build-cache cleanup tests OK"
