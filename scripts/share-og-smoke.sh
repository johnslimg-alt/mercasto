#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
AD_ID="${AD_ID:-}"
TMP_FILE="${TMPDIR:-/tmp}/mercasto-share-og-smoke.html"
ADS_FILE="${TMPDIR:-/tmp}/mercasto-share-og-ads.json"

command -v curl >/dev/null 2>&1 || {
  echo "curl is required" >&2
  exit 1
}

command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required" >&2
  exit 1
}

if [ -z "$AD_ID" ]; then
  ads_url="${BASE_URL%/}/api/ads?page=1"
  ads_code="$(curl -k -sS --max-time 20 -o "$ADS_FILE" -w '%{http_code}' "$ads_url" || true)"
  echo "$ads_url -> $ads_code"
  if [ "$ads_code" != "200" ]; then
    echo "FAIL: ads API returned HTTP $ads_code while discovering share smoke ad" >&2
    exit 1
  fi

  AD_ID="$(python3 - "$ADS_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as fh:
    data = json.load(fh)

items = []
if isinstance(data, dict):
    if isinstance(data.get("data"), list):
        items = data["data"]
    elif isinstance(data.get("data"), dict) and isinstance(data["data"].get("data"), list):
        items = data["data"]["data"]
    elif isinstance(data.get("ads"), list):
        items = data["ads"]
elif isinstance(data, list):
    items = data

for item in items:
    if isinstance(item, dict) and item.get("id"):
        print(item["id"])
        raise SystemExit(0)

raise SystemExit(1)
PY
)" || {
    echo "FAIL: could not discover an ad id from /api/ads?page=1 for share OG smoke" >&2
    exit 1
  }
fi

url="${BASE_URL%/}/share/ads/${AD_ID}"
code="$(curl -k -sS -L --max-time 20 -o "$TMP_FILE" -w '%{http_code}' "$url" || true)"
echo "$url -> $code"

if [ "$code" != "200" ]; then
  echo "FAIL: share page returned HTTP $code" >&2
  exit 1
fi

for token in og:title og:description og:image og:url twitter:card summary_large_image canonical; do
  if ! grep -Fq "$token" "$TMP_FILE"; then
    echo "FAIL: missing token $token" >&2
    exit 1
  fi
done

if grep -Fq 'id="root"' "$TMP_FILE"; then
  echo "FAIL: share page returned SPA shell" >&2
  exit 1
fi

echo "share og smoke OK"
