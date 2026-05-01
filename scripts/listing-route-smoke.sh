#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

http_status() {
  local url="$1"
  curl -k -sS -o /tmp/mercasto_listing_route_body.out -w '%{http_code}' "$url"
}

check_not_5xx() {
  local url="$1"
  local status
  status="$(http_status "$url")"
  echo "$url -> $status"
  if [[ "$status" =~ ^5 ]]; then
    echo "5xx response for $url" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd python3

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

echo "== Discover first ad id from API =="
ADS_JSON="$(curl -k -sS "${BASE_URL}/api/ads?page=1")"
FIRST_ID="$(printf '%s' "$ADS_JSON" | python3 - <<'PY'
import json, sys
try:
    data=json.load(sys.stdin)
except Exception:
    print('')
    raise SystemExit(0)
items=[]
if isinstance(data, dict):
    if isinstance(data.get('data'), list):
        items=data['data']
    elif isinstance(data.get('data'), dict) and isinstance(data['data'].get('data'), list):
        items=data['data']['data']
    elif isinstance(data.get('ads'), list):
        items=data['ads']
elif isinstance(data, list):
    items=data
print(items[0].get('id','') if items else '')
PY
)"

if [[ -z "$FIRST_ID" ]]; then
  echo "No first ad id discovered; checking generic endpoints only."
  check_not_5xx "${BASE_URL}/api/ads?page=1"
  check_not_5xx "${BASE_URL}/listing/1-test"
  check_not_5xx "${BASE_URL}/ads/1"
  check_not_5xx "${BASE_URL}/ad/1"
  echo "listing route smoke completed without discovered ad id"
  exit 0
fi

echo "first ad id: $FIRST_ID"

echo "== API detail =="
check_not_5xx "${BASE_URL}/api/ads/${FIRST_ID}"

echo "== Potential frontend detail routes =="
check_not_5xx "${BASE_URL}/ads/${FIRST_ID}"
check_not_5xx "${BASE_URL}/ad/${FIRST_ID}"
check_not_5xx "${BASE_URL}/listing/${FIRST_ID}"
check_not_5xx "${BASE_URL}/listing/${FIRST_ID}-test"

echo "listing route smoke OK"
