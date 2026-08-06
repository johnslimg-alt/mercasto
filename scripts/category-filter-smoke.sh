#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-category-filter-smoke.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

fetch_json() {
  local label="$1"
  local path="$2"
  local output="$3"
  local code

  code="$(curl -k -sS -o "$output" -w '%{http_code}' "${BASE_URL}${path}" || true)"
  echo "$label -> $code"

  if [[ "$code" != "200" ]]; then
    echo "FAIL: $label returned HTTP $code" >&2
    head -c 1000 "$output" 2>/dev/null || true
    echo >&2
    exit 1
  fi

  python3 -m json.tool "$output" >/dev/null
}

check_numeric_attribute() {
  local label="$1"
  local path="$2"
  local min_value="$3"
  local max_value="$4"
  local keys="$5"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9]/_}.json"

  fetch_json "$label" "$path" "$output"
  python3 - "$output" "$label" "$min_value" "$max_value" "$keys" <<'PY'
import json
import sys

path, label, raw_min, raw_max, raw_keys = sys.argv[1:]
minimum = float(raw_min)
maximum = float(raw_max)
keys = raw_keys.split(',')
with open(path, encoding='utf-8') as handle:
    payload = json.load(handle)
rows = payload.get('data') or []
total = int(payload.get('total') or 0)
if total <= 0 or not rows:
    raise SystemExit(f'FAIL: {label} returned an empty result set')
for row in rows:
    attributes = row.get('attributes')
    if not isinstance(attributes, dict):
        raise SystemExit(f"FAIL: {label} row {row.get('id')} has no attribute object")
    value = next((attributes.get(key) for key in keys if attributes.get(key) not in (None, '')), None)
    if value is None:
        raise SystemExit(f"FAIL: {label} row {row.get('id')} has none of {keys}")
    try:
        numeric = float(value)
    except (TypeError, ValueError) as error:
        raise SystemExit(f"FAIL: {label} row {row.get('id')} has non-numeric value {value!r}") from error
    if not minimum <= numeric <= maximum:
        raise SystemExit(f"FAIL: {label} row {row.get('id')} value {numeric} is outside [{minimum}, {maximum}]")
print(f'{label}: total={total}, validated={len(rows)}')
PY
}

check_price_range() {
  local output="$TMP_DIR/price.json"
  fetch_json "price range" "/api/ads?page=1&price_min=0&price_max=999999999" "$output"
  python3 - "$output" <<'PY'
import json, sys
with open(sys.argv[1], encoding='utf-8') as handle:
    payload = json.load(handle)
rows = payload.get('data') or []
if not rows:
    raise SystemExit('FAIL: price range returned no rows')
for row in rows:
    price = float(row['price'])
    if not 0 <= price <= 999999999:
        raise SystemExit(f"FAIL: price range row {row.get('id')} has {price}")
print(f"price range: total={payload.get('total')}, validated={len(rows)}")
PY
}

check_verified_only() {
  local output="$TMP_DIR/verified.json"
  fetch_json "verified only" "/api/ads?page=1&verified_only=1" "$output"
  python3 - "$output" <<'PY'
import json, sys
with open(sys.argv[1], encoding='utf-8') as handle:
    payload = json.load(handle)
rows = payload.get('data') or []
if not rows:
    raise SystemExit('FAIL: verified_only returned no rows')
for row in rows:
    if not bool((row.get('user') or {}).get('is_verified')):
        raise SystemExit(f"FAIL: verified_only returned unverified row {row.get('id')}")
print(f"verified only: total={payload.get('total')}, validated={len(rows)}")
PY
}

echo "== Category filter smoke =="
check_price_range
fetch_json "published days" "/api/ads?page=1&published_days=365" "$TMP_DIR/published.json"
check_verified_only
check_numeric_attribute "motor year" "/api/ads?page=1&category=motor&filters%5Byear%5D%5Bmin%5D=2015&filters%5Byear%5D%5Bmax%5D=2026" 2015 2026 "año,year"
check_numeric_attribute "motor kilometraje" "/api/ads?page=1&category=motor&filters%5Bkilometraje%5D%5Bmin%5D=0&filters%5Bkilometraje%5D%5Bmax%5D=999999" 0 999999 "kilometraje,km,kms"
check_numeric_attribute "inmobiliaria metros" "/api/ads?page=1&category=inmobiliaria&filters%5Bmetros_cuadrados%5D%5Bmin%5D=1&filters%5Bmetros_cuadrados%5D%5Bmax%5D=1000000" 1 1000000 "metros_cuadrados,m2,area"
check_numeric_attribute "inmobiliaria habitaciones" "/api/ads?page=1&category=inmobiliaria&filters%5Bhabitaciones%5D%5Bmin%5D=0&filters%5Bhabitaciones%5D%5Bmax%5D=100" 0 100 "habitaciones,rooms"
check_numeric_attribute "inmobiliaria banos" "/api/ads?page=1&category=inmobiliaria&filters%5Bbanos%5D%5Bmin%5D=0&filters%5Bbanos%5D%5Bmax%5D=100" 0 100 "baños,banos,bathrooms"
check_numeric_attribute "empleo salario" "/api/ads?page=1&category=empleo&filters%5Bsalario%5D%5Bmin%5D=0&filters%5Bsalario%5D%5Bmax%5D=1000000" 0 1000000 "salario,salary"

echo "category filter smoke OK"
