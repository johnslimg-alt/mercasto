#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Mercasto launch status summary =="

echo "\n== Required launch artifacts =="
bash scripts/launch-artifact-inventory.sh >/tmp/mercasto-launch-artifact-inventory.out
cat /tmp/mercasto-launch-artifact-inventory.out | grep -E '^(ready:|missing:|launch artifact inventory OK)' || true

echo "\n== Gate commands =="
cat <<'EOF'
Production health:
  bash scripts/server-operator.sh verify_quick

Strict launch gates:
  REQUIRE_ENV_READY=1 npm run smoke:env-readiness
  REQUIRE_CATEGORY_DATA_READY=1 npm run smoke:category-data
  REQUIRE_SMS_READY=1 npm run smoke:sms-readiness
  npm run verify:launch

Browser smoke:
  npm run e2e:public:ci

Ops evidence:
  bash scripts/backup-freshness-smoke.sh

Security evidence:
  npm run smoke:security
  npm run smoke:public-manifests
  npm run smoke:route-audit
  npm run check:static-safety
EOF

echo "\n== Launch blocker map =="
cat <<'EOF'
#260 SMS readiness
#261 direct nginx 80/443 architecture decision
#262 production sync after autonomous commits
#263 auth/account E2E
#264 ads lifecycle E2E
#265 payments and webhook recovery
#266 category attributes seed and fresh DB proof
#267 ops restore rollback and alerts
#268 security pass evidence
#269 legal and business readiness
#270 SEO and AEO readiness
#271 Lighthouse and performance baseline
#272 master launch go/no-go tracker
EOF

echo "\n== Stop conditions =="
cat <<'EOF'
- UP is not 200.
- VERIFY_EXIT is not 0.
- verify:launch fails.
- SMS readiness is not ready.
- Payment webhook evidence is missing.
- Auth/account E2E evidence is missing.
- Backup restore/rollback evidence is missing.
- Security pass evidence is missing.
- Legal/business readiness is missing.
- Secrets or stack traces are found in public output.
- Frontend loses ownership of ports 80/443 under current non-Traefik topology.
EOF

echo "\nlaunch status summary OK"
