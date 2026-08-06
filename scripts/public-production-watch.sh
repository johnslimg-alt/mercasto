#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-external}"
BASE_URL="${BASE_URL:-https://mercasto.com}"
WATCH_ATTEMPTS="${WATCH_ATTEMPTS:-6}"
WATCH_DELAY_SECONDS="${WATCH_DELAY_SECONDS:-8}"
WATCH_CONNECT_TIMEOUT="${WATCH_CONNECT_TIMEOUT:-10}"
WATCH_MAX_TIME="${WATCH_MAX_TIME:-30}"
CONNECTIVITY_UNAVAILABLE_EXIT=75
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-production-watch.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

case "$MODE" in
  external)
    FORCE_IPV4=1
    ALLOW_CONNECTIVITY_FALLBACK=1
    ;;
  fallback)
    FORCE_IPV4=0
    ALLOW_CONNECTIVITY_FALLBACK=0
    ;;
  *)
    echo "usage: $0 [external|fallback]" >&2
    exit 2
    ;;
esac

watch_curl() {
  if [[ "$FORCE_IPV4" = "1" ]]; then
    curl -4 "$@"
  else
    curl "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

connectivity_failure() {
  local url="$1"
  if [[ "$ALLOW_CONNECTIVITY_FALLBACK" = "1" ]]; then
    echo "external runner could not establish an HTTP connection to $url" >&2
    return "$CONNECTIVITY_UNAVAILABLE_EXIT"
  fi
  echo "fallback runner could not establish an HTTP connection to $url" >&2
  return 1
}
check_status() {
  local url="$1"
  local expected_pattern="$2"
  local attempt status
  local saw_http=0

  for ((attempt = 1; attempt <= WATCH_ATTEMPTS; attempt++)); do
    status="$(watch_curl -k -sS -o /dev/null -w '%{http_code}' \
      --connect-timeout "$WATCH_CONNECT_TIMEOUT" --max-time "$WATCH_MAX_TIME" "$url" || true)"
    status="${status:-000}"
    echo "$url -> $status (attempt $attempt/$WATCH_ATTEMPTS)"

    if [[ "$status" != "000" ]]; then
      saw_http=1
    fi
    if [[ "$status" =~ $expected_pattern ]]; then
      return 0
    fi
    if (( attempt < WATCH_ATTEMPTS )); then
      sleep "$WATCH_DELAY_SECONDS"
    fi
  done

  if [[ "$saw_http" = "0" ]]; then
    connectivity_failure "$url"
    return $?
  fi

  echo "unexpected HTTP status for $url after retries: $status" >&2
  return 1
}

download_200() {
  local url="$1"
  local output="$2"
  local attempt status
  local saw_http=0

  for ((attempt = 1; attempt <= WATCH_ATTEMPTS; attempt++)); do
    status="$(watch_curl -k -sS -o "$output" -w '%{http_code}' \
      --connect-timeout "$WATCH_CONNECT_TIMEOUT" --max-time "$WATCH_MAX_TIME" "$url" || true)"
    status="${status:-000}"
    echo "$url -> $status (attempt $attempt/$WATCH_ATTEMPTS)"

    if [[ "$status" != "000" ]]; then
      saw_http=1
    fi
    if [[ "$status" = "200" ]]; then
      return 0
    fi
    if (( attempt < WATCH_ATTEMPTS )); then
      sleep "$WATCH_DELAY_SECONDS"
    fi
  done

  if [[ "$saw_http" = "0" ]]; then
    connectivity_failure "$url"
    return $?
  fi

  echo "unexpected HTTP status for $url after retries: $status" >&2
  return 1
}
require_cmd curl
require_cmd grep

echo "== Public production watch ($MODE) =="

check_status "${BASE_URL}/up" '^200$'
check_status "${BASE_URL}/" '^(200|301|302)$'
check_status "${BASE_URL}/api/categories" '^200$'
check_status "${BASE_URL}/api/ads?page=1" '^200$'
check_status "${BASE_URL}/api/auth/providers" '^200$'

download_200 "${BASE_URL}/" "$TMP_DIR/home.html"
download_200 "${BASE_URL}/sitemap.xml" "$TMP_DIR/sitemap.xml"
download_200 "${BASE_URL}/robots.txt" "$TMP_DIR/robots.txt"

grep -Eiq '<title[^>]*>[^<]{10,70}</title>' "$TMP_DIR/home.html"
grep -Eiq 'name="description"|property="og:description"' "$TMP_DIR/home.html"
grep -Eiq 'application/ld\+json|schema.org' "$TMP_DIR/home.html"
grep -Eiq '<urlset|<sitemapindex|<url>' "$TMP_DIR/sitemap.xml"
grep -Eiq 'Sitemap:|User-agent:' "$TMP_DIR/robots.txt"

for path in \
  /.env \
  /.git/config \
  /backend/.env \
  /composer.json \
  /composer.lock \
  /package.json \
  /package-lock.json \
  /pnpm-lock.yaml \
  /yarn.lock \
  /vite.config.js \
  /vite.config.ts \
  /vite.config.mjs \
  /tailwind.config.js \
  /tailwind.config.ts \
  /tailwind.config.mjs \
  /horizon \
  /vendor/horizon
do
  check_status "${BASE_URL}${path}" '^(403|404|410)$'
done

echo "public production watch OK ($MODE)"
