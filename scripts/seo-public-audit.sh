#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
TMP_DIR="${TMPDIR:-/tmp}/mercasto-seo-audit"
mkdir -p "$TMP_DIR"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

fetch_body() {
  local path="$1"
  local output="$2"
  curl -k -sSL --max-time 20 "${BASE_URL}${path}" -o "$output"
}

status_code() {
  curl -k -sS -o /dev/null -w '%{http_code}' --max-time 20 "$1"
}

page_cache_path() {
  local path="$1"
  printf '%s/%s.html' "$TMP_DIR" "$(printf '%s' "$path" | tr '/?' '__')"
}

assert_not_noindex() {
  local path="$1"
  local file
  file="$(page_cache_path "$path")"
  fetch_body "$path" "$file"

  if grep -Eiq '<meta[^>]+name=["'"'']robots["'"''][^>]+content=["'"''][^"'"'']*noindex|x-robots-tag:[[:space:]]*noindex' "$file"; then
    echo "unexpected noindex on public page: ${BASE_URL}${path}" >&2
    exit 1
  fi

  if ! grep -Eiq '<title>[^<]{8,}</title>' "$file"; then
    echo "missing or too-short title on public page: ${BASE_URL}${path}" >&2
    exit 1
  fi
}

assert_homepage_metadata() {
  local file
  file="$(page_cache_path "/")"
  fetch_body "/" "$file"

  if ! grep -Eiq '<meta[^>]+name=["'"'']description["'"''][^>]+content=["'"''][^"'"'']{40,170}["'"'']' "$file"; then
    echo "homepage missing useful meta description" >&2
    exit 1
  fi

  if ! grep -Eiq '<link[^>]+rel=["'"'']canonical["'"''][^>]+href=["'"'']https://mercasto\.com/?["'"'']' "$file"; then
    echo "homepage missing canonical URL" >&2
    exit 1
  fi

  if ! grep -Eiq '<meta[^>]+property=["'"'']og:title["'"'']|<meta[^>]+property=["'"'']og:description["'"'']' "$file"; then
    echo "homepage missing Open Graph title/description metadata" >&2
    exit 1
  fi

  if ! grep -Eiq 'application/ld\+json|schema\.org' "$file"; then
    echo "homepage missing JSON-LD/schema.org structured data for AEO" >&2
    exit 1
  fi
}

assert_no_legacy_public_copy() {
  local path="$1"
  local file="$TMP_DIR/$(printf '%s' "$path" | tr '/?' '__').copy.html"
  fetch_body "$path" "$file"

  if grep -Eiq 'reefmt\.com|localhost:|127\.0\.0\.1|ngrok|stack trace|undefined|null placeholder' "$file"; then
    echo "legacy/debug copy found on public page: ${BASE_URL}${path}" >&2
    grep -Ein 'reefmt\.com|localhost:|127\.0\.0\.1|ngrok|stack trace|undefined|null placeholder' "$file" >&2 || true
    exit 1
  fi
}

require_cmd curl
require_cmd grep

echo "== Mercasto public SEO audit =="
echo "BASE_URL=${BASE_URL}"

echo "== Public pages must be indexable and titled =="
assert_not_noindex "/"
assert_not_noindex "/listings"
assert_homepage_metadata
assert_no_legacy_public_copy "/"
assert_no_legacy_public_copy "/listings"

echo "== robots.txt sanity =="
robots_status="$(status_code "${BASE_URL}/robots.txt")"
echo "/robots.txt -> ${robots_status}"
if [[ "$robots_status" == "200" ]]; then
  robots_file="$TMP_DIR/robots.txt"
  fetch_body "/robots.txt" "$robots_file"
  if grep -Eiq '^Disallow:[[:space:]]*/[[:space:]]*$' "$robots_file"; then
    echo "robots.txt blocks the entire site" >&2
    exit 1
  fi
elif [[ ! "$robots_status" =~ ^(404|403)$ ]]; then
  echo "unexpected robots.txt status: ${robots_status}" >&2
  exit 1
fi

echo "== sitemap.xml sanity =="
sitemap_status="$(status_code "${BASE_URL}/sitemap.xml")"
echo "/sitemap.xml -> ${sitemap_status}"
if [[ "$sitemap_status" == "200" ]]; then
  sitemap_file="$TMP_DIR/sitemap.xml"
  fetch_body "/sitemap.xml" "$sitemap_file"
  if ! grep -Eiq '<urlset|<sitemapindex' "$sitemap_file"; then
    echo "sitemap.xml is present but does not look like a sitemap" >&2
    exit 1
  fi
elif [[ ! "$sitemap_status" =~ ^(404|403)$ ]]; then
  echo "unexpected sitemap.xml status: ${sitemap_status}" >&2
  exit 1
fi

echo "public SEO audit OK"
