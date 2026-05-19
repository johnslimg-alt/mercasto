#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
TMP_DIR="${TMPDIR:-/tmp}"
ALL_FILE="$TMP_DIR/mercasto-range-all.json"
FILTERED_FILE="$TMP_DIR/mercasto-range-filtered.json"

fetch_json() {
  local url="$1"
  local out="$2"
  local code

  code="$(curl -k -sS -o "$out" -w '%{http_code}' "$url" || true)"
  echo "$url -> $code"

  if [ "$code" != "200" ]; then
    echo "FAIL: expected HTTP 200, got $code" >&2
    head -c 1000 "$out" 2>/dev/null || true
    echo >&2
    exit 1
  fi

  python3 -m json.tool "$out" >/dev/null
}

assert_filtered_subset() {
  local attribute="$1"
  local minimum="$2"
  local filtered="$3"

  python3 - "$attribute" "$minimum" "$filtered" <<'PY'
import json
import sys
from pathlib import Path

attribute = sys.argv[1]
minimum = float(sys.argv[2])
path = Path(sys.argv[3])
payload = json.loads(path.read_text())
items = payload.get('data', []) if isinstance(payload, dict) else []
violations = []

for item in items:
    attrs = item.get('attributes') or {}
    if isinstance(attrs, str):
        try:
            attrs = json.loads(attrs)
        except Exception:
            attrs = {}
    value = attrs.get(attribute)
    if value in (None, ''):
        continue
    try:
        numeric = float(value)
    except Exception:
        violations.append({'id': item.get('id'), 'value': value, 'reason': 'not numeric'})
        continue
    if numeric < minimum:
        violations.append({'id': item.get('id'), 'value': value, 'reason': 'below min'})

if violations:
    print(json.dumps({'ok': False, 'violations': violations[:10]}, ensure_ascii=False))
    sys.exit(1)

print(json.dumps({'ok': True, 'checked': len(items), 'attribute': attribute, 'min': minimum}, ensure_ascii=False))
PY
}

echo "== Category range verification =="

echo "This helper verifies that representative range filters return JSON and do not include below-min values when matching data exists."

fetch_json "$BASE_URL/api/ads?page=1&category=coches-y-motor/coches" "$ALL_FILE"
fetch_json "$BASE_URL/api/ads?page=1&category=coches-y-motor/coches&filters%5Byear%5D%5Bmin%5D=2015" "$FILTERED_FILE"
assert_filtered_subset "año" "2015" "$FILTERED_FILE"

fetch_json "$BASE_URL/api/ads?page=1&category=inmuebles/departamentos&filters%5Bm2%5D%5Bmin%5D=20" "$FILTERED_FILE"
assert_filtered_subset "metros_cuadrados" "20" "$FILTERED_FILE"

fetch_json "$BASE_URL/api/ads?page=1&category=empleos/ventas&filters%5Bsalario%5D%5Bmin%5D=1" "$FILTERED_FILE"
assert_filtered_subset "salario" "1" "$FILTERED_FILE"

echo "category range verification OK"
