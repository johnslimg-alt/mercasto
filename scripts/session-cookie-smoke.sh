#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
COOKIE_NAME="${COOKIE_NAME:-mercasto_session}"
TMP_HEADERS="${TMPDIR:-/tmp}/mercasto-cookie-headers.txt"

command -v curl >/dev/null 2>&1 || {
  echo "curl is