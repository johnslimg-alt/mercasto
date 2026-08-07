#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${BASE_URL:-https://mercasto.com}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

asset_headers="$tmp/asset.headers"
asset_body="$tmp/asset.json"
curl -ksS --max-time 20 -D "$asset_headers" -o "$asset_body" "$BASE_URL/.well-known/assetlinks.json"
asset_status="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END {print code}' "$asset_headers")"
asset_type="$(awk -F': *' 'tolower($1)=="content-type" {print tolower($2)}' "$asset_headers" | tr -d '\r' | tail -1)"
[[ "$asset_status" == "200" ]] || { echo "assetlinks status $asset_status" >&2; exit 1; }
[[ "$asset_type" == application/json* ]] || { echo "assetlinks content-type $asset_type" >&2; exit 1; }
python3 - "$asset_body" <<'PY'
import json, sys
items = json.load(open(sys.argv[1], encoding='utf-8'))
assert any(item.get('target', {}).get('package_name') == 'com.mercasto.app' for item in items)
PY

aasa_headers="$tmp/aasa.headers"
aasa_body="$tmp/aasa.body"
curl -ksS --max-time 20 -D "$aasa_headers" -o "$aasa_body" "$BASE_URL/.well-known/apple-app-site-association"
aasa_status="$(awk 'toupper($1) ~ /^HTTP\// {code=$2} END {print code}' "$aasa_headers")"
aasa_type="$(awk -F': *' 'tolower($1)=="content-type" {print tolower($2)}' "$aasa_headers" | tr -d '\r' | tail -1)"
case "$aasa_status" in
  200)
    [[ "$aasa_type" == application/json* ]] || { echo "AASA content-type $aasa_type" >&2; exit 1; }
    python3 -m json.tool "$aasa_body" >/dev/null
    ;;
  404) : ;;
  *) echo "AASA unexpected status $aasa_status" >&2; exit 1 ;;
esac

echo "mobile association smoke OK (assetlinks=200 JSON, AASA=$aasa_status)"
