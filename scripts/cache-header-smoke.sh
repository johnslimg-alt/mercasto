#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
TMP_HEADERS="${TMPDIR:-/tmp}/mercasto-homepage-headers.txt"

command -v curl >/dev/null 2>&1 || {
  echo "curl is required" >&2
  exit 1
}

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Homepage HTML cache header smoke =="

action_url="${BASE_URL}/"
status="$(curl -k -sS -D "$TMP_HEADERS" -o /dev/null -w '%{http_code}' --max-time 20 "$action_url")"
echo "$action_url -> $status"

if [[ ! "$status" =~ ^(200|301|302)$ ]]; then
  echo "unexpected homepage status for cache header smoke: $status" >&2
  cat "$TMP_HEADERS" >&2 || true
  exit 1
fi

if grep -Eiq '^cache-control:[[:space:]]*.*public.*(max-age=[1-9][0-9]{4,}|immutable)' "$TMP_HEADERS"; then
  echo "homepage HTML appears to be long-cacheable" >&2
  cat "$TMP_HEADERS" >&2 || true
  exit 1
fi

if grep -Eiq '^service-worker-allowed:' "$TMP_HEADERS"; then
  echo "homepage exposes Service-Worker-Allowed header; dedicated PWA/cache gate is required before enabling it" >&2
  cat "$TMP_HEADERS" >&2 || true
  exit 1
fi

echo "homepage cache headers OK"
