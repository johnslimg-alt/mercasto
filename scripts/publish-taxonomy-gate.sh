#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCREEN="src/components/screens/PostScreen.jsx"
TEST="tests/e2e/ads-lifecycle.spec.js"

echo "== Publish taxonomy gate =="
grep -qF "category === 'coches' ? 'motor' : category" "$SCREEN"
grep -qF 'Array.isArray(translated)' "$SCREEN"
grep -qF "/Sedán|Sedan/i" "$TEST"
echo "publish taxonomy gate OK"
