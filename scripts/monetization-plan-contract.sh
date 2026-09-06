#!/usr/bin/env bash
set -euo pipefail
PLAN="docs/runbooks/MONETIZATION_CLIP_PLAN.md"
SEEDER="backend/database/seeders/PaymentProductsSeeder.php"
CONTROLLER="backend/app/Http/Controllers/Api/PaymentController.php"
for file in "$PLAN" "$SEEDER" "$CONTROLLER"; do test -f "$file"; done
for pair in \
  'package_impulso|99' \
  'package_negocio|249' \
  'package_pro|599' \
  'boost_1_day|19' \
  'boost_3_days|49' \
  'highlight_7_days|79' \
  'featured_7_days|149' \
  'featured_30_days|399' \
  'top_category_7_days|399'; do
  code="${pair%%|*}"; price="${pair##*|}"
  grep -qF "\`$code\` | $price MXN" "$PLAN"
  grep -qF "'code' => '$code'" "$SEEDER"
  grep -qF "'$code' => ['amount' => $price" "$CONTROLLER" || grep -qF "'$code' => ['amount' => $price.0" "$CONTROLLER"
done
grep -qF '0.04176' "$PLAN"
grep -qF 'break_even_units_for_product_i' "$PLAN"
grep -qF 'Do not launch paid traffic or paid seller products until:' "$PLAN"
echo 'monetization plan contract OK'
