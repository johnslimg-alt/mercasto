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
  npm run smoke:sms-launch-mode
  REQUIRE_LEGAL_READY=1 npm run smoke:legal-readiness
  npm run smoke:backup-freshness
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

echo \"\n== Deferred product features ==\"
cat <<'EOF'
- SMS/phone OTP is not planned. Public phone/SMS UI must remain disabled.
EOF

echo "\n== Stop conditions =="
cat <<'EOF'
- UP is not 200.
- VERIFY_EXIT is not 0.
- verify:launch fails.
- Public phone/SMS functionality becomes enabled; SMS/OTP is an intentionally excluded product feature.
- Payment webhook evidence is missing.
- Auth/account E2E evidence is missing.
- Backup restore/rollback evidence is missing.
- Security evidence issue #287 is not completed.
- Legal/business readiness is missing.
- Secrets or stack traces are found in public output.
- Frontend loses ownership of ports 80/443 under current non-Traefik topology.
- Broad paid traffic starts before the managed CDN/WAF decision is implemented.
EOF

echo "\nlaunch status summary OK"
