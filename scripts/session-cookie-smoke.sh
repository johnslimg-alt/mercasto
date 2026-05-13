#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
COOKIE_NAME="${COOKIE_NAME:-mercasto_session}"
TMP_HEADERS="${TMPDIR:-/tmp}/mercasto-cookie-headers.txt"

command -v curl >/dev/null 2>&1 || {
  echo "curl is required" >&2
  exit 1
}

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Session cookie smoke =="
echo "probing ${BASE_URL}/sanctum/csrf-cookie"

status="$(curl -k -sS -D "$TMP_HEADERS" -o /dev/null -w '%{http_code}' --max-time 20 "${BASE_URL}/sanctum/csrf-cookie")"
echo "${BASE_URL}/sanctum/csrf-cookie -> ${status}"

case "$status" in
  200|204|301|302) ;;
  *)
    echo "unexpected status for csrf-cookie endpoint: $status" >&2
    cat "$TMP_HEADERS" >&2 || true
    exit 1
    ;;
esac

session_cookie_line="$(grep -i '^set-cookie:' "$TMP_HEADERS" | grep -i "${COOKIE_NAME}=" | head -1 || true)"

if [[ -z "$session_cookie_line" ]]; then
  echo "session cookie '${COOKIE_NAME}' was not observed; endpoint may not create a Laravel session cookie" >&2
  echo "observed Set-Cookie headers:" >&2
  grep -i '^set-cookie:' "$TMP_HEADERS" >&2 || true
  exit 1
fi

echo "observed session cookie header for ${COOKIE_NAME}"

if ! printf '%s' "$session_cookie_line" | grep -Eiq ';[[:space:]]*Secure(;|$)'; then
  echo "session cookie is missing Secure" >&2
  exit 1
fi

if ! printf '%s' "$session_cookie_line" | grep -Eiq ';[[:space:]]*HttpOnly(;|$)'; then
  echo "session cookie is missing HttpOnly" >&2
  exit 1
fi

if ! printf '%s' "$session_cookie_line" | grep -Eiq ';[[:space:]]*SameSite=(Lax|Strict|None)(;|$)'; then
  echo "session cookie is missing SameSite" >&2
  exit 1
fi

echo "session cookie smoke OK"
