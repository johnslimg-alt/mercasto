#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
URL="${BASE_URL}/api/auth/providers"
BODY_FILE="${TMPDIR:-/tmp}/mercasto-auth-providers.json"

command -v curl >/dev/null 2>&1 || {
  echo "curl is required" >&2
  exit 1
}

command -v tr >/dev/null 2>&1 || {
  echo "tr is required" >&2
  exit 1
}

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Auth providers public smoke =="
status="$(curl -k -sS -o "$BODY_FILE" -w '%{http_code}' --max-time 20 "$URL")"
echo "$URL -> $status"

if [[ "$status" != "200" ]]; then
  echo "unexpected status for auth providers endpoint: $status" >&2
  cat "$BODY_FILE" >&2 || true
  exit 1
fi

compact_body="$(tr -d '[:space:]' < "$BODY_FILE")"
if ! printf '%s' "$compact_body" | grep -Eq '^(\{.*\}|\[.*\])$'; then
  echo "auth providers endpoint did not return JSON-looking body" >&2
  cat "$BODY_FILE" >&2 || true
  exit 1
fi

echo "auth providers smoke OK"
