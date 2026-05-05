#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

bash scripts/export-route-inventory.sh
bash scripts/check-route-inventory-artifact.sh

echo "route inventory gate OK"
