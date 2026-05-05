#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACT="$ROOT_DIR/docs/route-inventory-generated.md"

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

echo "route inventory artifact OK: $ARTIFACT"
