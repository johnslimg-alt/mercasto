#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SEEDER="backend/database/seeders/E2eTestSeeder.php"
DATABASE_SEEDER="backend/database/seeders/DatabaseSeeder.php"
ADS_E2E="tests/e2e/ads-lifecycle.spec.js"
PAYMENTS_E2E="tests/e2e/payments.spec.js"

echo "== E2E fixture safety gate =="

grep -qF "app()->environment('production')" "$SEEDER"
grep -qF 'E2E test users cannot be seeded in production.' "$SEEDER"
grep -qF "Mercasto E2E Expired Listing" "$SEEDER"
grep -qF "Mercasto E2E Active Listing" "$SEEDER"
grep -qF "E2E_BUYER_EMAIL" "$SEEDER"
grep -qF "!app()->environment('production')" "$DATABASE_SEEDER"
grep -qF 'E2E_SELLER_EMAIL' "$ADS_E2E"
grep -qF 'CLIP_WEBHOOK_SECRET' "$PAYMENTS_E2E"

echo "E2E fixture safety gate OK"
