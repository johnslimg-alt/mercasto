#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

command -v grep >/dev/null 2>&1 || {
  echo "missing required command: grep" >&2
  exit 1
}

echo "== Service worker cache policy guard =="

matches="$(grep -RInE 'serviceWorker\.register|register\([^)]*service-worker|register\([^)]*sw\.js|navigator\.serviceWorker\.register' \
  index.html src public backend scripts .github \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  --exclude='*.map' \
  2>/dev/null || true)"

if [[ -n "$matches" ]]; then
  test -f public/sw.js || {
    echo "service worker registration detected but public/sw.js is missing" >&2
    echo "$matches" >&2
    exit 1
  }

  if grep -nE "addEventListener\\(['\"]fetch|caches\\.|CacheStorage|cacheName|CACHE_NAME|precache|addAll\\(" public/sw.js >&2; then
    echo "service worker caching detected; Mercasto only allows Web Push service workers without fetch/cache handling." >&2
    exit 1
  fi

  grep -qF "self.addEventListener('push'" public/sw.js || {
    echo "service worker registration detected but push handler is missing" >&2
    exit 1
  }

  echo "push-only service worker registration found"
  echo "service worker cache policy scan OK"
  exit 0
fi

echo "no frontend service worker registration found"
echo "service worker unregister cleanup is allowed"
echo "cache policy scan OK"
