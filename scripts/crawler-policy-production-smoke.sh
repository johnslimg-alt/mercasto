#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
ROBOTS_TMP="/tmp/mercasto_crawler_policy.$(id -u).txt"
trap 'rm -f "$ROBOTS_TMP"' EXIT

check_status() {
  local url="$1"
  local expected="$2"
  local attempts="${SMOKE_HTTP_ATTEMPTS:-12}"
  local delay="${SMOKE_HTTP_RETRY_DELAY:-5}"
  local status="000"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    status="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 30 "$url" || true)"
    status="${status:-000}"
    echo "$url -> $status (attempt $attempt/$attempts)"
    if [[ "$status" =~ $expected ]]; then
      return 0
    fi
    (( attempt < attempts )) && sleep "$delay"
  done

  echo "unexpected status for $url: $status" >&2
  return 1
}

echo "== Published crawler policy smoke =="
curl -k -fsS --retry 5 --retry-delay 5 --retry-all-errors --max-time 30 \
  "${BASE_URL}/robots.txt" -o "$ROBOTS_TMP"

for allowed in Googlebot Google-Extended OAI-SearchBot OAI-AdsBot Claude-SearchBot Claude-User PerplexityBot; do
  grep -qF "User-agent: $allowed" "$ROBOTS_TMP"
done
for blocked in GPTBot ClaudeBot; do
  grep -A1 -F "User-agent: $blocked" "$ROBOTS_TMP" | grep -qF 'Disallow: /'
done
for private_path in /api/ /admin /dashboard /post /login /register /horizon /sanctum /graphql /webhooks /storage/kyc/; do
  grep -qF "Disallow: $private_path" "$ROBOTS_TMP"
done

grep -qF 'Sitemap: https://mercasto.com/sitemap.xml' "$ROBOTS_TMP"
check_status "${BASE_URL}/llms.txt" '^404$'

echo "published crawler policy smoke OK"
