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
  npm run smoke:offsite-backup
  npm run verify:launch

Browser smoke:
  npm run e2e:public:ci

Ops evidence:
  bash scripts/backup-freshness-smoke.sh
  bash scripts/offsite-backup-smoke.sh

Security evidence:
  npm run smoke:security
  npm run smoke:public-manifests
  npm run smoke:route-audit
  npm run check:static-safety
EOF

echo "\n== Active launch blockers =="
cat <<'EOF'
#12 full-project desktop/tablet/mobile UX/UI + interaction audit before broad scale
#269 owner legal/business sign-off (technical policy checks are complete)
#272 master launch go/no-go tracker; DNSSEC stabilization/observation still gates broad paid scale
#408 DNSSEC + managed CDN/WAF traffic-scale gate; owner plan/risk decision remains after DNSSEC stability
#147 Ubuntu maintenance is staged and must wait until the DNSSEC stabilization transition is complete
EOF

echo "\n== Open security follow-up =="
cat <<'EOF'
#536 provider-side revocation evidence remains for any historical non-Google AI/API credential; runtime is local-only
EOF

echo "\n== Deferred product features =="
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
- Off-host backup replication or monthly remote restore evidence is stale/failed.
- Security smoke, public-manifest, route-audit, or static-safety evidence fails.
- Legal/business readiness is missing.
- Secrets or stack traces are found in public output.
- Frontend loses ownership of ports 80/443 under current non-Traefik topology.
- Broad paid traffic starts before the DNSSEC stabilization/observation requirements in #272/#408 are complete.
- Broad paid traffic starts before the managed CDN/WAF plan or explicit owner risk decision in #408 is recorded.
EOF

echo "\nlaunch status summary OK"
