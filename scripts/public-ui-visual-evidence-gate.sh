#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Public UI visual evidence contract gate =="
node --check scripts/capture-ui-visual-evidence.mjs
grep -qF "name: 'desktop-1920'" scripts/capture-ui-visual-evidence.mjs
grep -qF "name: 'tablet-768-portrait'" scripts/capture-ui-visual-evidence.mjs
grep -qF "name: 'tablet-820-portrait'" scripts/capture-ui-visual-evidence.mjs
grep -qF "name: 'mobile-360'" scripts/capture-ui-visual-evidence.mjs
grep -qF "name: 'mobile-430'" scripts/capture-ui-visual-evidence.mjs
grep -qF "name: 'webkit-desktop-safari'" scripts/capture-ui-visual-evidence.mjs
grep -qF "name: 'webkit-iphone13'" scripts/capture-ui-visual-evidence.mjs
grep -qF "path: '/post'" scripts/capture-ui-visual-evidence.mjs
grep -qF "path: '/profile'" scripts/capture-ui-visual-evidence.mjs
grep -qF "path: '/admin'" scripts/capture-ui-visual-evidence.mjs
if grep -qE "path: '/vendedores'|path: '/publicar-gratis'|path: '/publish'|path: '/account/listings'|path: '/admin/login'" scripts/capture-ui-visual-evidence.mjs; then
  echo "Legacy route leaked into canonical visual baseline" >&2
  exit 1
fi
echo "public UI visual evidence contract gate OK"
