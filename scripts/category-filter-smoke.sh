#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
TMP_FILE="${TMPDIR:-/tmp}/mercasto-category-filter-smoke.json"

check_url() {
  local label="$1"
  local path="$2"
  local url="${BASE_URL}${path}"
  local code

  code="$(curl -k -sS -o "$TMP_FILE" -w '%{http_code}' "$url" || true)"
  echo "$label -> $code"

  if [ "$code" != "200" ]; then
    echo "FAIL: $label returned HTTP $code" >&2
    head -c 1000 "$TMP_FILE" 2>/dev/null || true
    echo >&2
    exit 1
  fi

  python3 -m json.tool "$TMP_FILE" >/dev/null
}

echo "== Category filter smoke =="

check_url "price range" "/api/ads?page=1&price_min=0&price_max=999999999"
check_url "published days" "/api/ads?page=1&published_days=365"
check_url "verified only" "/api/ads?page=1&verified_only=1"
check_url "autos exact attribute" "/api/ads?page=1&category=coches-y-motor/coches&filters%5Bmarca%5D=Toyota"
check_url "autos range attribute" "/api/ads?page=1&category=coches-y-motor/coches&filters%5Byear%5D%5Bmin%5D=2015&filters%5Byear%5D%5Bmax%5D=2026"
check_url "inmuebles range attribute" "/api/ads?page=1&category=inmuebles/departamentos&filters%5Bm2%5D%5Bmin%5D=20&filters%5Bm2%5D%5Bmax%5D=500"
check_url "empleos salary attribute" "/api/ads?page=1&category=empleos/ventas&filters%5Bsalario%5D%5Bmin%5D=0"

echo "category filter smoke OK"
