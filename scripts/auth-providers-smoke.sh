#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
URL="${BASE_URL}/api/auth/providers"

command -v curl >/dev/null 2>&1 || {
  echo "curl is required" >&2
  exit 1
}

echo "== Auth providers public smoke =="
status="$(curl -k -sS -o /tmp/mercasto-auth-providers.json -w '%{http_code}' --max-time 20 "$URL")"
echo "$URL -> $status"

if [[ "$status" != "200" ]]; then
  echo "unexpected status for auth providers endpoint: $status" >&2
  cat /tmp/mercasto-auth-providers.json >&2 || true
  exit 1
fi

if ! grep -Eq '\{.*\}|\[.*\]' /tmp/mercasto-auth-providers.json; then
  echo "auth providers endpoint did not return JSON-looking body" >&2
  cat /tmp/mercasto-auth-providers.json >&2 || true
  exit 1
fi

echo "auth providers smoke OK"
