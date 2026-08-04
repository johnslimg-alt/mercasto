#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STATUS="scripts/launch-status-summary.sh"
E2E="scripts/public-e2e-ci.sh"
SCAN="scripts/repository-sensitive-artifact-scan.sh"
PACKAGE="package.json"

echo "== Launch readiness contract gate =="

for file in "$STATUS" "$E2E" "$SCAN" "$PACKAGE"; do
  test -f "$file"
done

grep -qF 'npm run smoke:sms-launch-mode' "$STATUS"
if grep -qF 'REQUIRE_SMS_READY=1' "$STATUS"; then
  echo "launch summary still requires a provider even when the public SMS flow is disabled" >&2
  exit 1
fi
grep -qF 'REQUIRE_LEGAL_READY=1 npm run smoke:legal-readiness' "$STATUS"
grep -qF 'npm run smoke:backup-freshness' "$STATUS"
grep -qF 'Broad paid traffic starts before the managed CDN/WAF decision is implemented.' "$STATUS"

grep -qF 'bash scripts/public-e2e-ci.sh' "$PACKAGE"
grep -qF 'npm ci --no-audit --no-fund' "$E2E"
grep -qF 'npx --no-install playwright install chromium' "$E2E"
grep -qF 'npx --no-install playwright test' "$E2E"
grep -qF -- '--output="$results_dir"' "$E2E"
grep -qF 'PLAYWRIGHT_HTML_OUTPUT_DIR' "$E2E"
grep -qF '/tmp/mercasto-public-e2e-' "$E2E"

for excluded in './.claude' './postgres-data' './postgres-backups'; do
  grep -qF -- "-path '$excluded' -prune" "$SCAN"
done

echo "launch readiness contract gate OK"
