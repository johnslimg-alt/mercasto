#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DOCS_DIR="$ROOT_DIR/docs"
OUTPUT_FILE="$DOCS_DIR/route-inventory-generated.md"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/artisan" ]]; then
  echo "Laravel artisan not found in backend directory" >&2
  exit 1
fi

mkdir -p "$DOCS_DIR"

COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
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
  cat "$TMP_ROUTE_LIST"
  echo '```'
} > "$OUTPUT_FILE"

echo "wrote $OUTPUT_FILE"
