#!/usr/bin/env bash
#
# Daily batch IndexNow submission for the canonical ads sitemap.
#
# This is the target of the 04:00 root cron entry
#  0 4 * * * cd /var/www/mercasto && ./scripts/submit-all-to-indexnow.sh > /var/log/mercasto-indexnow.log 2>&1
# which had been failing with "not found" every night because the script did not exist in the
# repository. IndexNow feeds Bing, Yandex, Seznam, Naver and Yep - never Google - so this is
# discovery speed, not an indexing blocker; it must therefore fail loudly but never pretend to
# have submitted something it did not.
#
# Our own site is only ever read with GET requests (sitemap + key file); the POST goes to the
# IndexNow endpoint, not to Mercasto.
#
# Usage: scripts/submit-all-to-indexnow.sh
#
set -euo pipefail

BASE_URL="${MERCASTO_INDEXNOW_BASE_URL:-https://mercasto.com}"
KEY="${MERCASTO_INDEXNOW_KEY:-a7f5b8c9d2e4f6a1b3c5d7e9f2a4b6c8}"
ENDPOINT="${MERCASTO_INDEXNOW_ENDPOINT:-https://api.indexnow.org/indexnow}"
CURL_TIMEOUT="${MERCASTO_INDEXNOW_CURL_TIMEOUT:-30}"
MAX_URLS=10000
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-indexnow.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

log() { printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

# 1. The receiving engines fetch /{key}.txt and compare it with the submitted key.
key_status="$(curl -sS -o "$TMP_DIR/key.txt" -w '%{http_code}' --max-time "$CURL_TIMEOUT" "$BASE_URL/$KEY.txt" || true)"
served_key="$(tr -d '\r\n' < "$TMP_DIR/key.txt" 2>/dev/null || true)"
if [[ "$key_status" != "200" || "$served_key" != "$KEY" ]]; then
  log "FAIL key file $BASE_URL/$KEY.txt -> HTTP ${key_status:-000}, content $( [[ "$served_key" == "$KEY" ]] && echo 'ok' || echo 'does NOT match the submitted key' )"
  exit 1
fi
log "OK   key file served and matches the submitted key"

# 2. Submit the canonical listings advertised by the ads sitemap.
sitemap_status="$(curl -sS -o "$TMP_DIR/sitemap-ads.xml" -w '%{http_code}' --max-time "$CURL_TIMEOUT" "$BASE_URL/sitemap-ads.xml" || true)"
if [[ "$sitemap_status" != "200" ]]; then
  log "FAIL sitemap-ads.xml -> HTTP ${sitemap_status:-000} (the batch cannot be built)"
  exit 1
fi

# grep exits 1 when the sitemap carries no <loc> entries: that is the "nothing to submit" case.
{ grep -o '<loc>[^<]*</loc>' "$TMP_DIR/sitemap-ads.xml" || true; } | sed -e 's#</\?loc>##g' | sort -u > "$TMP_DIR/urls.txt"
url_count="$(wc -l < "$TMP_DIR/urls.txt" | tr -d ' ')"
if [[ "$url_count" -eq 0 ]]; then
  log "Nothing to submit: the ads sitemap advertises zero listings (see the generator health header)."
  exit 0
fi

if [[ "$url_count" -gt "$MAX_URLS" ]]; then
  log "FAIL ads sitemap advertises $url_count URLs, above the $MAX_URLS single-request IndexNow limit."
  exit 1
fi

python3 - "$TMP_DIR/urls.txt" "$KEY" "$BASE_URL" > "$TMP_DIR/payload.json" <<'PY'
import json
import sys
from urllib.parse import urlparse

urls_path, key, base_url = sys.argv[1], sys.argv[2], sys.argv[3]
with open(urls_path, encoding='utf-8') as handle:
    urls = [line.strip() for line in handle if line.strip()]
print(json.dumps({
    'host': urlparse(base_url).hostname,
    'key': key,
    'keyLocation': f'{base_url.rstrip("/")}/{key}.txt',
    'urlList': urls,
}))
PY

submit_status="$(curl -sS -o "$TMP_DIR/response.txt" -w '%{http_code}' --max-time "$CURL_TIMEOUT" \
  -X POST -H 'Content-Type: application/json; charset=utf-8' --data @"$TMP_DIR/payload.json" "$ENDPOINT" || true)"

# IndexNow answers 200 (accepted) or 202 (accepted, key validation pending).
if [[ "$submit_status" != "200" && "$submit_status" != "202" ]]; then
  log "FAIL IndexNow submission of $url_count URL(s) -> HTTP ${submit_status:-000} $(head -c 200 "$TMP_DIR/response.txt" 2>/dev/null | tr -d '\n')"
  exit 1
fi

log "OK   submitted $url_count URL(s) from sitemap-ads.xml to $ENDPOINT (HTTP $submit_status)"
