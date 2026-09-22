#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COPY="src/components/screens/legal/ReembolsosScreen.jsx"
PAYMENT="backend/app/Http/Controllers/Api/PaymentController.php"
LEGAL="docs/legal/MEXICO_LEGAL_SOURCE_REVIEW_2026-08-28.md"
NGINX="default.conf"
PUBLIC_SEO="backend/config/public_seo.php"
BUILD_ASSET_ROOT="dist/assets"

FIXED_PERIOD_CLAIMS=(
  'no se renuevan automáticamente'
  'se requiere una nueva compra para activar otro periodo'
)

FORBIDDEN_CLAIMS=(
  'La cancelación evita renovaciones posteriores'
  'cancelar la renovación futura'
)

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "required file is missing: $1"
}

assert_fixed_period_copy() {
  local file="$1" label="$2" phrase
  require_file "$file"

  for phrase in "${FIXED_PERIOD_CLAIMS[@]}"; do
    grep -qF "$phrase" "$file" || fail "$label is missing the fixed-period disclosure: '$phrase'"
  done

  for phrase in "${FORBIDDEN_CLAIMS[@]}"; do
    if grep -qF "$phrase" "$file"; then
      fail "$label implies a recurring renewal/cancellation path that is not implemented: '$phrase'"
    fi
  done
}

assert_route_contract() {
  require_file "$PUBLIC_SEO"
  require_file "$NGINX"

  grep -qF "'reembolsos' => [" "$PUBLIC_SEO"     || fail "/reembolsos is missing from backend public SEO routing"
  grep -qF "'moderacion' => [" "$PUBLIC_SEO"     || fail "/moderacion is missing from backend public SEO routing"

  local shell_block
  shell_block="$(sed -n '/# Sitemap-listed verticals\/public pages/,/^[[:space:]]*}/p' "$NGINX")"
  grep -qF 'reembolsos' <<<"$shell_block"     || fail "/reembolsos is missing from the Laravel-decorated nginx shell route"
  grep -qF 'moderacion' <<<"$shell_block"     || fail "/moderacion is missing from the Laravel-decorated nginx shell route"
}

assert_built_bundle() {
  [ -d "$BUILD_ASSET_ROOT" ]     || fail "REQUIRE_BUILT_ARTIFACT=1 but $BUILD_ASSET_ROOT was not produced by the build"

  local first="${FIXED_PERIOD_CLAIMS[0]}"
  local second="${FIXED_PERIOD_CLAIMS[1]}"
  local candidate=""

  while IFS= read -r file; do
    if grep -qF "$second" "$file"; then
      candidate="$file"
      break
    fi
  done < <(grep -rlF --include='*.js' "$first" "$BUILD_ASSET_ROOT" 2>/dev/null || true)

  [ -n "$candidate" ]     || fail "built frontend bundle is missing the fixed-period refund disclosure"

  local phrase
  for phrase in "${FORBIDDEN_CLAIMS[@]}"; do
    if grep -R --include='*.js' -qF "$phrase" "$BUILD_ASSET_ROOT"; then
      fail "built frontend bundle implies a recurring renewal/cancellation path that is not implemented: '$phrase'"
    fi
  done

  echo "Validated built refund-policy bundle: $candidate"
}

echo "== Fixed-period plan copy gate =="

assert_fixed_period_copy "$COPY" "React refund screen"

require_file "$PAYMENT"
grep -qF "'plan_expires_at' => now()->addMonth()" "$PAYMENT"   || fail "payment implementation no longer proves a fixed one-month plan period"

require_file "$LEGAL"
grep -qF 'no automatic renewal/recurring-charge path is implemented' "$LEGAL"   || fail "legal source review no longer documents the absence of automatic renewal"

assert_route_contract

if [ "${REQUIRE_BUILT_ARTIFACT:-0}" = "1" ]; then
  assert_built_bundle
  MODE="built"
else
  MODE="source"
  echo "Source contract validated; built artifact check is enabled in CI after npm run build."
fi

echo "fixed-period plan copy gate OK (mode: $MODE)"
