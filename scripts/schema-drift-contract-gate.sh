#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Production schema drift contract gate =="
for file in \
  backend/database/migrations/2026_06_21_100000_create_image_hashes_table.php \
  backend/database/migrations/2026_06_21_200000_create_user_violations_table.php \
  backend/database/migrations/2026_07_02_000001_create_blocked_users_table.php \
  backend/database/migrations/2026_08_07_051000_adopt_referrals_table.php \
  backend/database/migrations/2026_08_07_051100_adopt_payment_products_table.php \
  ops/schema/known-unmanaged-production-tables.txt \
  scripts/schema-migration-inventory.py \
  scripts/production-schema-drift-smoke.sh; do
  test -f "$file"
done

inventory="$(scripts/schema-migration-inventory.py)"
for table in blocked_users image_hashes user_violations referrals payment_products; do
  grep -qxF "$table" <<<"$inventory"
done
for table in blacklist category_names_backup_20260704 real_estate_developments; do
  grep -qxF "$table" ops/schema/known-unmanaged-production-tables.txt
  if grep -qxF "$table" <<<"$inventory"; then
    echo "FAIL: $table is both migration-managed and known-unmanaged" >&2
    exit 1
  fi
done
if grep -qE "Schema::create\(['\"]payment_products['\"]" backend/database/seeders/PaymentProductsSeeder.php; then
  echo "FAIL: payment_products schema creation must live in migrations, not the seeder" >&2
  exit 1
fi
grep -qF 'bash scripts/production-schema-drift-smoke.sh' scripts/server-operator.sh
bash -n scripts/production-schema-drift-smoke.sh
python3 -m py_compile scripts/schema-migration-inventory.py

echo "production schema drift contract gate OK"
