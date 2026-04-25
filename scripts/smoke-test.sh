#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://mercasto.com}"
FAILURES=0

check_status() {
  local label="$1"
  local path="$2"
  local expected="${3:-200}"
  local url="${BASE_URL}${path}"

  echo "==> ${label}: ${url}"
  status=$(curl -L -sS -o /tmp/mercasto-smoke-body -w '%{http_code}' --max-time 20 "$url" || echo "000")

  if [ "$status" != "$expected" ]; then
    echo "FAIL ${label}: expected ${expected}, got ${status}"
    echo "Body preview:"
    head -c 500 /tmp/mercasto-smoke-body || true
    echo
    FAILURES=$((FAILURES + 1))
  else
    echo "PASS ${label}: ${status}"
  fi
}

check_json() {
  local label="$1"
  local path="$2"
  local url="${BASE_URL}${path}"

  echo "==> ${label}: ${url}"
  status=$(curl -L -sS -o /tmp/mercasto-smoke-body -w '%{http_code}' --max-time 20 "$url" || echo "000")

  if [ "$status" != "200" ]; then
    echo "FAIL ${label}: expected 200, got ${status}"
    head -c 500 /tmp/mercasto-smoke-body || true
    echo
    FAILURES=$((FAILURES + 1))
    return
  fi

  if ! python3 -m json.tool /tmp/mercasto-smoke-body >/dev/null 2>&1; then
    echo "FAIL ${label}: response is not valid JSON"
    head -c 500 /tmp/mercasto-smoke-body || true
    echo
    FAILURES=$((FAILURES + 1))
    return
  fi

  echo "PASS ${label}: 200 valid JSON"
}

echo "Mercasto smoke test"
echo "Base URL: ${BASE_URL}"
echo

check_status "Homepage" "/" "200"
check_status "Laravel up route" "/up" "200"
check_status "Nginx health route" "/health" "200"
check_json "Categories API" "/api/categories"
check_json "Ads API" "/api/ads?page=1"
check_json "Auth providers API" "/api/auth/providers"

if [ "$FAILURES" -ne 0 ]; then
  echo
  echo "Smoke test failed with ${FAILURES} failure(s)."
  exit 1
fi

echo
echo "Smoke test passed."
