#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SEEDER="backend/database/seeders/E2eTestSeeder.php"
DATABASE_SEEDER="backend/database/seeders/DatabaseSeeder.php"
ADS_E2E="tests/e2e/ads-lifecycle.spec.js"
PAYMENTS_E2E="tests/e2e/payments.spec.js"
PROD_E2E_SMOKE="scripts/production-e2e-account-security-smoke.sh"
WORKFLOW=".github/workflows/e2e-seller.yml"

echo "== E2E fixture safety gate =="

grep -qF "app()->environment('production')" "$SEEDER"
grep -qF 'E2E test users cannot be seeded in production.' "$SEEDER"
grep -qF "Mercasto E2E Expired Listing" "$SEEDER"
grep -qF "Mercasto E2E Active Listing" "$SEEDER"
grep -qF "E2E_BUYER_EMAIL" "$SEEDER"
grep -qF "!app()->environment('production')" "$DATABASE_SEEDER"
grep -qF 'E2E_SELLER_EMAIL' "$ADS_E2E"
grep -qF 'CLIP_WEBHOOK_SECRET' "$PAYMENTS_E2E"
test -x "$PROD_E2E_SMOKE"
bash -n "$PROD_E2E_SMOKE"
grep -qF 'repository seeder default' "$PROD_E2E_SMOKE"
grep -qF 'Seller Production E2E Tests' "$WORKFLOW"
grep -qF 'isolated-launch-e2e-gate.sh' "$WORKFLOW"
if grep -qF 'CLIP_WEBHOOK_SECRET: ${{ secrets.CLIP_WEBHOOK_SECRET }}' "$WORKFLOW"; then
  echo "FAIL: production seller E2E workflow must not import the payment webhook secret" >&2
  exit 1
fi

echo "E2E fixture safety gate OK"
