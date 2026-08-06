#!/usr/bin/env bash
set -euo pipefail

DEFAULT_ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="${ROOT_DIR:-$DEFAULT_ROOT_DIR}"
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/backend}"
DOCS_DIR="${DOCS_DIR:-$ROOT_DIR/docs}"
OUTPUT_FILE="${OUTPUT_FILE:-$DOCS_DIR/route-inventory-generated.md}"
NORMALIZER="${ROUTE_INVENTORY_NORMALIZER:-$ROOT_DIR/scripts/normalize-route-inventory.sh}"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/artisan" ]]; then
  echo "Laravel artisan not found in backend directory" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

if [[ ! -x "$NORMALIZER" ]]; then
  echo "route inventory normalizer not executable: $NORMALIZER" >&2
  exit 1
fi

COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
if ! git -C "$ROOT_DIR" diff-index --quiet HEAD -- 2>/dev/null; then
  COMMIT_SHA="${COMMIT_SHA}-dirty"
fi
GENERATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

TMP_ROUTE_LIST="$(mktemp)"
trap 'rm -f "$TMP_ROUTE_LIST"' EXIT

(
  cd "$BACKEND_DIR"
  php artisan route:list --except-vendor -v
) > "$TMP_ROUTE_LIST"

{
  echo "# Mercasto Generated Route Inventory"
  echo
  echo "Generated at: $GENERATED_AT"
  echo "Commit: $COMMIT_SHA"
  echo "Source: php artisan route:list --except-vendor -v"
  echo
  echo '```text'
  bash "$NORMALIZER" < "$TMP_ROUTE_LIST"
  echo '```'
} > "$OUTPUT_FILE"

echo "wrote $OUTPUT_FILE"
