#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/backend}"
SIGNATURES="${ROUTE_INVENTORY_SIGNATURES:-$ROOT_DIR/docs/route-inventory-signatures.json}"
JSON_NORMALIZER="${ROUTE_INVENTORY_JSON_NORMALIZER:-$ROOT_DIR/scripts/normalize-route-inventory-json.py}"

[[ -f "$BACKEND_DIR/artisan" ]] || { echo "Laravel artisan not found: $BACKEND_DIR/artisan" >&2; exit 1; }
[[ -f "$SIGNATURES" ]] || { echo "route inventory semantic signatures not found: $SIGNATURES" >&2; exit 1; }
[[ -x "$JSON_NORMALIZER" ]] || { echo "route inventory JSON normalizer not executable: $JSON_NORMALIZER" >&2; exit 1; }

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
CURRENT_JSON="$TMP_DIR/current-route-list.json"
CURRENT_SIGNATURES="$TMP_DIR/current-signatures.json"

(
  cd "$BACKEND_DIR"
  php artisan route:list --except-vendor --json
) > "$CURRENT_JSON"

python3 "$JSON_NORMALIZER" < "$CURRENT_JSON" > "$CURRENT_SIGNATURES"

if ! diff -u "$SIGNATURES" "$CURRENT_SIGNATURES"; then
  cat >&2 <<'MSG'
route inventory is stale: the committed semantic route signatures differ from the current application route list.
Regenerate the inventory in an authoritative Laravel environment with `bash scripts/export-route-inventory.sh` and commit both route inventory artifacts.
Only framework environment routes (`storage/{path}` and `up`) are excluded; generated Laravel route names are normalized away.
MSG
  exit 1
fi

echo "route inventory freshness gate OK"
