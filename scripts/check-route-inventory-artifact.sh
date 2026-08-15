#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT="${ROUTE_INVENTORY_ARTIFACT:-$ROOT_DIR/docs/route-inventory-generated.md}"
SIGNATURES="${ROUTE_INVENTORY_SIGNATURES:-$ROOT_DIR/docs/route-inventory-signatures.json}"

if [[ ! -f "$ARTIFACT" ]]; then
  echo "missing route inventory artifact: $ARTIFACT" >&2
  echo "run: bash scripts/export-route-inventory.sh" >&2
  exit 1
fi

if [[ ! -s "$ARTIFACT" ]]; then
  echo "route inventory artifact is empty: $ARTIFACT" >&2
  exit 1
fi

if ! grep -q "Mercasto Generated Route Inventory" "$ARTIFACT"; then
  echo "route inventory artifact header is missing" >&2
  exit 1
fi

if ! grep -q "Source: php artisan route:list --except-vendor -v" "$ARTIFACT"; then
  echo "route inventory artifact source marker is missing" >&2
  exit 1
fi

if ! grep -q "Commit:" "$ARTIFACT"; then
  echo "route inventory artifact commit marker is missing" >&2
  exit 1
fi

if grep -qE "pending-server-export|Pending generation" "$ARTIFACT"; then
  echo "route inventory artifact is still a placeholder; regenerate it on the server" >&2
  exit 1
fi

if ! grep -qE "GET|POST|PUT|PATCH|DELETE" "$ARTIFACT"; then
  echo "route inventory artifact does not contain route rows" >&2
  exit 1
fi

if [[ ! -s "$SIGNATURES" ]]; then
  echo "route inventory semantic signatures are missing or empty: $SIGNATURES" >&2
  exit 1
fi

python3 - "$SIGNATURES" <<'PYJSON'
import json
import sys

rows = json.load(open(sys.argv[1], encoding='utf-8'))
if not isinstance(rows, list) or not rows:
    raise SystemExit('route inventory semantic signatures must be a non-empty JSON list')
if any((row.get('name') or '').startswith('generated::') for row in rows):
    raise SystemExit('route inventory semantic signatures contain unstable generated route names')
if any(row.get('uri') in {'storage/{path}', 'up'} for row in rows):
    raise SystemExit('route inventory semantic signatures contain framework environment routes')
PYJSON

echo "route inventory artifact OK: $ARTIFACT"
echo "route inventory semantic signatures OK: $SIGNATURES"
