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

command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required" >&2
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

python3 - "$BODY_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as fh:
    data = json.load(fh)

if not isinstance(data, dict):
    raise SystemExit("auth providers response must be a JSON object")

providers = data.get("providers", data)
for key in ("google", "apple", "telegram"):
    value = providers.get(key)
    if isinstance(value, dict):
        value = value.get("enabled")
    if not isinstance(value, bool):
        raise SystemExit(f"auth provider {key!r} must be boolean")
PY

echo "auth providers smoke OK"
