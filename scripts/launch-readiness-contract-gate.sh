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
grep -qF 'npm run smoke:offsite-backup' "$STATUS"
grep -qF '#500 true off-host PostgreSQL backup replication' "$STATUS"
grep -qF 'Broad paid traffic starts before the managed CDN/WAF decision is implemented.' "$STATUS"
if grep -qF '#260 ' "$STATUS"; then
  echo "closed SMS issue #260 must not remain in the active blocker map" >&2
  exit 1
fi
grep -qF 'SMS/phone OTP is not planned. Public phone/SMS UI must remain disabled.' "$STATUS"
grep -qF '#268 security pass evidence' "$STATUS"
grep -qF '#270 SEO and AEO readiness' "$STATUS"
grep -qF '#271 Lighthouse and performance baseline' "$STATUS"

python3 - "$PACKAGE" <<'PY2'
import json
import sys

scripts = json.load(open(sys.argv[1]))['scripts']
for name in ('smoke:all', 'gate:prod'):
    if 'smoke:sms-readiness' in scripts[name]:
        raise SystemExit(f'{name} still runs optional SMS provider readiness')
if 'smoke:sms-launch-mode' not in scripts['verify:launch']:
    raise SystemExit('verify:launch must enforce the disabled SMS product mode')
PY2

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
