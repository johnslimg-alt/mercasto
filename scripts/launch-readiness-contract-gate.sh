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
grep -qF '#12 full-project desktop/tablet/mobile UX/UI + interaction audit before broad scale' "$STATUS"
grep -qF '#269 owner legal/business sign-off' "$STATUS"
grep -qF '#272 master launch go/no-go tracker' "$STATUS"
grep -qF '#408 DNSSEC + managed CDN/WAF traffic-scale gate' "$STATUS"
grep -qF '#147 Ubuntu maintenance is staged' "$STATUS"
grep -qF '#536 provider-side revocation evidence remains' "$STATUS"
grep -qF 'Broad paid traffic starts before the DNSSEC stabilization/observation requirements in #272/#408 are complete.' "$STATUS"
grep -qF 'Broad paid traffic starts before the managed CDN/WAF plan or explicit owner risk decision in #408 is recorded.' "$STATUS"
grep -qF 'SMS/phone OTP is not planned. Public phone/SMS UI must remain disabled.' "$STATUS"

for closed_issue in 260 261 262 263 264 265 266 267 268 270 271 287 500; do
  if grep -qE "^#${closed_issue}([[:space:]]|$)" "$STATUS"; then
    echo "closed issue #${closed_issue} must not remain in the active blocker map" >&2
    exit 1
  fi
done

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
grep -qF 'workers="${PLAYWRIGHT_WORKERS:-1}"' "$E2E"
grep -qF 'report_dir="${PLAYWRIGHT_HTML_OUTPUT_DIR:-${ROOT_DIR}/playwright-report}"' "$E2E"

for excluded in './.claude' './postgres-data' './postgres-backups'; do
  grep -qF -- "-path '$excluded' -prune" "$SCAN"
done

echo "launch readiness contract gate OK"
