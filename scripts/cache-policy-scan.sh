#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v grep >/dev/null 2>&1 || {
  echo "missing required command: grep" >&2
  exit 1
}

echo "== Service worker cache policy guard =="

matches="$(grep -RInE 'navigator\.serviceWorker|serviceWorker\.register|register\([^)]*service-worker|register\([^)]*sw\.js' \
  src public backend scripts .github \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude='*.map' \
  2>/dev/null || true)"

if [[ -n "$matches" ]]; then
  echo "service worker registration detected" >&2
  echo "Mercasto requires a dedicated PWA/cache gate and rollback plan before enabling service worker registration in production." >&2
  echo "$matches" >&2
  exit 1
fi

echo "no frontend service worker registration found"
echo "cache policy scan OK"
