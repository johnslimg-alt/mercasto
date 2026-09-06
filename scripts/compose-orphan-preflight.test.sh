#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1 $2" == "compose config" ]] || [[ "$1 $2 $3" == "compose --env-file test.env" && "${4:-}" == "config" ]]; then
  printf '%s\n' '{"name":"mercasto","services":{"postgres":{},"mercasto-backend":{}}}'
elif [[ "$1" == "ps" ]]; then
  printf '%s\n' 'mercasto_db_container' "${EXTRA_CONTAINER:-}"
elif [[ "$1" == "inspect" ]]; then
  case "${@: -1}" in
    mercasto_db_container) printf '%s\n' 'postgres' ;;
    passport-nginx) printf '%s\n' 'passport-nginx' ;;
    *) printf '%s\n' '' ;;
  esac
else
  echo "unexpected mock docker args: $*" >&2
  exit 2
fi
MOCK
chmod +x "$TMP/docker"
PATH="$TMP:$PATH" bash "$ROOT_DIR/scripts/compose-orphan-preflight.sh" --env-file test.env >/dev/null
if EXTRA_CONTAINER=passport-nginx PATH="$TMP:$PATH" bash "$ROOT_DIR/scripts/compose-orphan-preflight.sh" --env-file test.env >/dev/null 2>&1; then
  echo 'FAIL: foreign project-labeled container was not blocked' >&2
  exit 1
fi
echo 'compose orphan preflight test OK'
