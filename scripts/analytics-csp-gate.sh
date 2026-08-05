#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Analytics CSP gate =="

grep -qF 'https://analytics.tiktok.com' security_headers.conf
grep -qF 'https://connect.facebook.net' security_headers.conf
grep -qF 'https://analytics.tiktok.com/i18n/pixel/events.js' src/utils/tiktokPixel.js
grep -qF 'https://connect.facebook.net/en_US/fbevents.js' src/utils/analytics.js

echo "analytics CSP gate OK"
