#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROBOTS="public/robots.txt"
BACKEND_ROBOTS="backend/public/robots.txt"
POLICY="docs/seo/CRAWLER_AND_AI_REFERRAL_POLICY_2026-08-05.md"
ATTRIBUTION="src/utils/campaignAttribution.js"
CLASSIFIER="src/utils/trafficSourceClassification.js"

echo "== Crawler and AI referral policy gate =="

cmp -s "$ROBOTS" "$BACKEND_ROBOTS" || {
  echo "frontend and backend robots policies differ" >&2
  exit 1
}

for allowed in Googlebot Google-Extended OAI-SearchBot OAI-AdsBot Claude-SearchBot Claude-User PerplexityBot; do
  grep -qF "User-agent: $allowed" "$ROBOTS"
done

for blocked in GPTBot ClaudeBot; do
  grep -A1 -F "User-agent: $blocked" "$ROBOTS" | grep -qF 'Disallow: /'
done

for private_path in /api/ /admin /dashboard /post /login /register /horizon /sanctum /graphql /webhooks /storage/kyc/; do
  grep -qF "Disallow: $private_path" "$ROBOTS"
done

test ! -e public/llms.txt
test ! -e backend/public/llms.txt
grep -qF 'location = /llms.txt { return 404; }' default.conf
grep -qF 'Mercasto does not publish `/llms.txt`.' "$POLICY"
grep -qF 'Google-Extended | Allow public routes' "$POLICY"
grep -qF 'GPTBot | Block all' "$POLICY"
grep -qF 'ClaudeBot | Block all' "$POLICY"

grep -qF "['chatgpt.com', 'chatgpt']" "$CLASSIFIER"
grep -qF "['perplexity.ai', 'perplexity']" "$CLASSIFIER"
grep -qF "['claude.ai', 'claude']" "$CLASSIFIER"
grep -qF "['gemini.google.com', 'gemini']" "$CLASSIFIER"
grep -qF "['copilot.microsoft.com', 'microsoft_copilot']" "$CLASSIFIER"
grep -qF 'attribution_medium' "$ATTRIBUTION"
grep -qF 'attribution_channel' "$ATTRIBUTION"
grep -qF 'attribution_referrer_host' "$ATTRIBUTION"
grep -qF 'attribution_ai_referral' "$ATTRIBUTION"

node --test scripts/ai-referral-attribution.test.mjs

echo "crawler and AI referral policy gate OK"
