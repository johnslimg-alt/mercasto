#!/usr/bin/env bash
set -euo pipefail

SERVICE="backend/app/Services/GoogleSeoReportingService.php"
COMMAND="backend/app/Console/Commands/SeoInspectUrls.php"
CONFIG="backend/config/seo_reporting.php"
TEST="backend/tests/Feature/SeoUrlInspectionTest.php"

echo "== Search Console URL inspection gate =="
for file in "$SERVICE" "$COMMAND" "$CONFIG" "$TEST"; do test -f "$file"; done

grep -qF 'https://www.googleapis.com/auth/webmasters.readonly' "$SERVICE"
grep -qF 'search_console_inspection_api' "$CONFIG"
grep -qF 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect' "$CONFIG"
grep -qF 'public function inspectUrls(array $urls): array' "$SERVICE"
grep -qF '$normalized->count() > 20' "$SERVICE"
grep -qF "isset(\$parts['query'])" "$SERVICE"
grep -qF "isset(\$parts['fragment'])" "$SERVICE"
grep -qF "'inspectionUrl' => \$url" "$SERVICE"
grep -qF "'siteUrl' => \$site" "$SERVICE"
grep -qF "'sitemap_count'" "$SERVICE"
if grep -qF "'referringUrls' =>" "$SERVICE"; then
  echo "FAIL: URL inspection report must not expose referring URL rows" >&2
  exit 1
fi

grep -qF "protected \$signature = 'seo:inspect-urls" "$COMMAND"
grep -qF 'count($inputs) > 20' "$COMMAND"
grep -qF -- '--require-provider' "$COMMAND"
grep -qF 'test_inspection_rejects_external_query_or_fragment_urls_before_provider_call' "$TEST"

echo "Search Console URL inspection gate OK"
