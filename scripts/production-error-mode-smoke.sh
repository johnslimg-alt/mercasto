#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-mercasto_backend_container}"
LEAK_PATTERN='stack[[:space:]]*trace|stacktrace|SQLSTATE|Whoops|/var/www|vendor/laravel|APP_KEY|DB_PASSWORD|Illuminate\\|Symfony\\Component|Exception in'

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

probe_json_error() {
  local path="$1"
  local expected="$2"
  local body status
  body="$(mktemp)"

  status="$(curl -sS --connect-timeout 10 --max-time 20 \
    -H 'Accept: application/json' \
    -o "$body" -w '%{http_code}' \
    "${BASE_URL}${path}" || true)"

  printf '%-52s -> %s (%s bytes)\n' "$path" "$status" "$(wc -c < "$body")"

  if [[ ! "$status" =~ $expected ]]; then
    echo "unexpected status for ${BASE_URL}${path}: ${status}; expected ${expected}" >&2
    sed -n '1,40p' "$body" >&2
    rm -f "$body"
    exit 1
  fi

  if grep -Eiq "$LEAK_PATTERN" "$body"; then
    echo "sensitive debug/error fragment found in ${BASE_URL}${path}" >&2
    grep -Ein "$LEAK_PATTERN" "$body" >&2 || true
    rm -f "$body"
    exit 1
  fi

  rm -f "$body"
}

require_cmd curl
require_cmd docker
require_cmd grep
require_cmd timeout

if [[ "$(timeout 30s docker inspect -f '{{.State.Running}}' "$BACKEND_CONTAINER" 2>/dev/null || true)" != "true" ]]; then
  echo "backend container is not running: $BACKEND_CONTAINER" >&2
  exit 1
fi

echo "== Production error mode smoke =="
runtime="$(timeout 60s docker exec "$BACKEND_CONTAINER" php artisan tinker --execute='echo "env=" . app()->environment() . PHP_EOL; echo "debug=" . (config("app.debug") ? "true" : "false") . PHP_EOL;' 2>&1)"
printf '%s\n' "$runtime"

grep -qx 'env=production' <<< "$runtime"
grep -qx 'debug=false' <<< "$runtime"

probe_json_error '/api/definitely-missing-route' '^404$'
probe_json_error '/api/ads/not-a-number/edit' '^404$'
probe_json_error '/api/admin/kyc/document/999999999' '^401$'

echo "production error mode smoke OK"
