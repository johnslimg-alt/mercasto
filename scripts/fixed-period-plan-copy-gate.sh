#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COPY="src/components/screens/legal/ReembolsosScreen.jsx"
PAYMENT="backend/app/Http/Controllers/Api/PaymentController.php"
LEGAL="docs/legal/MEXICO_LEGAL_SOURCE_REVIEW_2026-08-28.md"

# The page a visitor actually reads at GET /reembolsos/ is NOT the React screen
# asserted above. default.conf serves static files before the SPA fallback
# (`try_files $uri $uri/ /index.html`), and Vite copies public/ into dist/
# verbatim, so the shipped document is:
#
#   public/reembolsos/index.html  ->  dist/reembolsos/index.html  ->  production
#
# The previous revision of this gate only grepped ReembolsosScreen.jsx, which is
# how the forbidden "recurring renewal / cancellation" wording survived on the
# live page for months while the gate stayed green. The assertions below run
# against the file that is actually deployed; when a build exists, the emitted
# artifact is checked too, and must be byte-identical to its public/ source.
#
# Set REQUIRE_BUILT_ARTIFACT=1 (CI does, right after `npm run build`) to make a
# missing dist/ artifact a hard failure instead of "not built in this context".
SHIPPED_SRC="public/reembolsos/index.html"
SHIPPED_DIST="dist/reembolsos/index.html"

# Fixed-period disclosure that must be present wherever the plan copy ships.
FIXED_PERIOD_CLAIMS=(
  'no se renuevan automáticamente'
  'se requiere una nueva compra para activar otro periodo'
)

# Copy that implies an autorenewal/cancellation path this product does not
# implement (`backend/app/Http/Controllers/Api/PaymentController.php` only sets
# `plan_expires_at = now()->addMonth()`; there is no recurring charge and no
# cancellation endpoint).
FORBIDDEN_CLAIMS=(
  'La cancelación evita renovaciones posteriores'
  'cancelar la renovación futura'
)

assert_fixed_period_copy() {
  local file="$1" label="$2" phrase

  for phrase in "${FIXED_PERIOD_CLAIMS[@]}"; do
    if ! grep -qF "$phrase" "$file"; then
      echo "FAIL: $label is missing the fixed-period disclosure: '$phrase'" >&2
      echo "      file: $file" >&2
      exit 1
    fi
  done

  for phrase in "${FORBIDDEN_CLAIMS[@]}"; do
    if grep -qF "$phrase" "$file"; then
      echo 'FAIL: refund copy implies a recurring renewal/cancellation path that is not implemented' >&2
      echo "      '$phrase' found in $label ($file)" >&2
      exit 1
    fi
  done
}

echo "== Fixed-period plan copy gate =="

grep -qF 'no se renuevan automáticamente' "$COPY"
grep -qF 'se requiere una nueva compra para activar otro periodo' "$COPY"
grep -qF "'plan_expires_at' => now()->addMonth()" "$PAYMENT"
grep -qF 'no automatic renewal/recurring-charge path is implemented' "$LEGAL"

assert_fixed_period_copy "$COPY" "React refund screen"

# The shipped document. This is the assertion that was missing: the live page
# carried forbidden copy while the gate only inspected the React screen.
if [ ! -f "$SHIPPED_SRC" ]; then
  echo "FAIL: shipped /reembolsos document is missing: $SHIPPED_SRC" >&2
  exit 1
fi
assert_fixed_period_copy "$SHIPPED_SRC" "shipped /reembolsos document (public/ -> dist/ verbatim)"

if [ -f "$SHIPPED_DIST" ]; then
  assert_fixed_period_copy "$SHIPPED_DIST" "built /reembolsos artifact"
  if ! cmp -s "$SHIPPED_SRC" "$SHIPPED_DIST"; then
    echo "FAIL: built artifact diverges from the deployed source it is copied from" >&2
    echo "      $SHIPPED_SRC != $SHIPPED_DIST" >&2
    exit 1
  fi
elif [ "${REQUIRE_BUILT_ARTIFACT:-0}" = "1" ]; then
  echo "FAIL: REQUIRE_BUILT_ARTIFACT=1 but $SHIPPED_DIST was not produced by the build" >&2
  exit 1
else
  echo "NOTE: dist/ not present; artifact checks skipped (set REQUIRE_BUILT_ARTIFACT=1 in a job that builds)" >&2
fi

echo "fixed-period plan copy gate OK"
