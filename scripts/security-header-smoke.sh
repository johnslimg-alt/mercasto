#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
HTTP_BASE_URL="${HTTP_BASE_URL:-}"
EXPECTED_HTTPS_ORIGIN="${EXPECTED_HTTPS_ORIGIN:-$BASE_URL}"
SECURITY_HEADER_ATTEMPTS="${SECURITY_HEADER_ATTEMPTS:-3}"
if [[ -z "$HTTP_BASE_URL" ]]; then
  HTTP_BASE_URL="http://${BASE_URL#https://}"
fi
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-security-headers.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

fetch_headers() {
  local url="$1"
  local output="$2"
  local attempt status

  for ((attempt = 1; attempt <= SECURITY_HEADER_ATTEMPTS; attempt++)); do
    status="$(curl -k -sS -D "$output.raw" -o /dev/null -w '%{http_code}' \
      --connect-timeout 10 --max-time 25 "$url" || true)"
    status="${status:-000}"
    if [[ "$status" != '000' ]]; then
      break
    fi
    if (( attempt < SECURITY_HEADER_ATTEMPTS )); then
      sleep 2
    fi
  done

  tr -d '\r' < "$output.raw" > "$output"
  printf '%s' "$status"
}
require_header() {
  local headers="$1"
  local name="$2"
  local pattern="$3"
  if ! grep -Eiq "^${name}:[[:space:]]*${pattern}" "$headers"; then
    echo "missing or unsafe ${name} header" >&2
    exit 1
  fi
}

require_hsts() {
  local headers="$1"
  local value max_age
  value="$(grep -Ei '^strict-transport-security:' "$headers" | head -1 || true)"
  max_age="$(printf '%s' "$value" | sed -nE 's/.*max-age=([0-9]+).*/\1/ip')"
  [[ "$max_age" =~ ^[0-9]+$ ]] || {
    echo "missing HSTS max-age" >&2
    exit 1
  }
  (( max_age >= 31536000 )) || {
    echo "HSTS max-age is shorter than one year" >&2
    exit 1
  }
  grep -Eiq 'includeSubDomains' <<<"$value" || {
    echo "HSTS is missing includeSubDomains" >&2
    exit 1
  }
}

reject_versioned_server() {
  local headers="$1"
  if grep -Eiq '^server:[[:space:]]*[^[:space:]]+/[0-9]' "$headers"; then
    echo "server header exposes an exact software version" >&2
    exit 1
  fi
}
check_https_headers() {
  local route="$1"
  local expected_status="$2"
  local label="$3"
  local headers="$TMP_DIR/${label}.headers"
  local status

  status="$(fetch_headers "${BASE_URL}${route}" "$headers")"
  echo "${BASE_URL}${route} -> ${status}"
  [[ "$status" =~ $expected_status ]] || {
    echo "unexpected status for ${BASE_URL}${route}: ${status}" >&2
    exit 1
  }

  require_hsts "$headers"
  require_header "$headers" 'x-content-type-options' 'nosniff([[:space:]]*)$'
  require_header "$headers" 'x-frame-options' '(SAMEORIGIN|DENY)([[:space:]]*)$'
  require_header "$headers" 'referrer-policy' '(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)([[:space:]]*)$'
  require_header "$headers" 'permissions-policy' '.*camera=\(\)'
  require_header "$headers" 'permissions-policy' '.*microphone=\(\)'
  require_header "$headers" 'content-security-policy' ".*object-src 'none'"
  require_header "$headers" 'content-security-policy' ".*base-uri 'self'"
  require_header "$headers" 'content-security-policy' ".*frame-ancestors 'self'"
  reject_versioned_server "$headers"
}

check_http_redirect() {
  local headers="$TMP_DIR/http-redirect.headers"
  local status location expected

  status="$(fetch_headers "${HTTP_BASE_URL}/" "$headers")"
  echo "${HTTP_BASE_URL}/ -> ${status}"
  [[ "$status" =~ ^(301|308)$ ]] || {
    echo "HTTP endpoint is not a permanent HTTPS redirect: ${status}" >&2
    exit 1
  }

  location="$(grep -Ei '^location:' "$headers" | head -1 | cut -d: -f2- | sed -E 's/^[[:space:]]+//')"
  expected="${EXPECTED_HTTPS_ORIGIN%/}"
  if [[ "$location" != "$expected" && "$location" != "$expected/"* ]]; then
    echo "HTTP redirect points outside the expected HTTPS origin" >&2
    exit 1
  fi
  reject_versioned_server "$headers"
}
require_cmd curl
require_cmd grep
require_cmd sed
require_cmd tr

echo "== Public security header smoke =="
check_https_headers '/' '^(200|301|302)$' homepage
check_https_headers '/api/categories' '^200$' categories
check_http_redirect
echo "public security header smoke OK"
