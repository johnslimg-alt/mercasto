#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

status_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' "$1"
}

check_status() {
  local path="$1"
  local expected_pattern="$2"
  local url="${BASE_URL}${path}"
  local status
  status="$(status_code "$url")"
  printf '%-45s -> %s\n' "$path" "$status"
  if [[ ! "$status" =~ $expected_pattern ]]; then
    echo "unexpected status for ${url}: ${status}; expected ${expected_pattern}" >&2
    exit 1
  fi
}

check_no_legacy_domain() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local body
  body="$(curl -k -sSL --max-time 15 "$url" || true)"
  if printf '%s' "$body" | grep -Eqi 'reefmt\.com|localhost:|127\.0\.0\.1|ngrok|test domain|debug|stack trace'; then
    echo "legacy/test/debug fragment found in ${url}" >&2
    printf '%s\n' "$body" | grep -Ein 'reefmt\.com|localhost:|127\.0\.0\.1|ngrok|test domain|debug|stack trace' >&2 || true
    exit 1
  fi
}

require_cmd curl

echo "== Mercasto production route audit =="
echo "BASE_URL=${BASE_URL}"

echo "== Public route availability =="
check_status "/" '^(200|301|302)$'
check_status "/listings" '^(200|301|302)$'
check_status "/listing/1-test" '^(200|301|302|404)$'
check_status "/publish" '^(200|301|302|401|403)$'
check_status "/login" '^(200|301|302)$'
check_status "/register" '^(200|301|302)$'
check_status "/account" '^(200|301|302|401|403)$'
check_status "/account/listings" '^(200|301|302|401|403)$'
check_status "/account/listing/1/edit" '^(200|301|302|401|403|404)$'
check_status "/account/listing/1/photos" '^(200|301|302|401|403|404)$'
check_status "/account/billing" '^(200|301|302|401|403)$'
check_status "/account/promotions" '^(200|301|302|401|403)$'
check_status "/payment/success" '^(200|301|302|400|401|403|404|422)$'
check_status "/payment/fail" '^(200|301|302|400|401|403|404|422)$'
check_status "/webhooks/clip" '^(200|204|400|401|403|404|405|419|422)$'

echo "== Sensitive/internal route denial =="
check_status "/horizon" '^(403|404|410)$'
check_status "/vendor/horizon" '^(403|404|410)$'
check_status "/.env" '^(403|404|410)$'
check_status "/.git/config" '^(403|404|410)$'
check_status "/backend/.env" '^(403|404|410)$'
check_status "/composer.json" '^(403|404|410)$'
check_status "/package.json" '^(403|404|410)$'

echo "== Legacy domain/debug text probes =="
check_no_legacy_domain "/"
check_no_legacy_domain "/listings"
check_no_legacy_domain "/login"
check_no_legacy_domain "/register"

echo "production route audit OK"
