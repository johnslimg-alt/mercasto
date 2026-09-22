#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-fixed-period.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p   "$TMP_DIR/scripts"   "$TMP_DIR/src/components/screens/legal"   "$TMP_DIR/backend/app/Http/Controllers/Api"   "$TMP_DIR/backend/config"   "$TMP_DIR/docs/legal"

cp "$ROOT_DIR/scripts/fixed-period-plan-copy-gate.sh" "$TMP_DIR/scripts/"

write_react_screen() {
  cat > "$TMP_DIR/src/components/screens/legal/ReembolsosScreen.jsx" <<'JSX'
export default function ReembolsosScreen() {
  return <p>Los planes se pagan por adelantado y no se renuevan automáticamente. Al terminar la vigencia, se requiere una nueva compra para activar otro periodo.</p>;
}
JSX
}

write_backend_contract() {
  cat > "$TMP_DIR/backend/app/Http/Controllers/Api/PaymentController.php" <<'PHP'
<?php
'plan_expires_at' => now()->addMonth()
PHP

  cat > "$TMP_DIR/docs/legal/MEXICO_LEGAL_SOURCE_REVIEW_2026-08-28.md" <<'MD'
no automatic renewal/recurring-charge path is implemented
MD

  cat > "$TMP_DIR/backend/config/public_seo.php" <<'PHP'
<?php
return ['pages' => [
  'reembolsos' => ['type' => 'WebPage'],
  'moderacion' => ['type' => 'WebPage'],
]];
PHP

  cat > "$TMP_DIR/default.conf" <<'NGINX'
# Sitemap-listed verticals/public pages and canonical aliases must reach Laravel
location ~ ^/(terminos|privacidad|cookies|moderacion|reembolsos|contacto|ayuda)/?$ {
  try_files $uri /index.php?$query_string;
}
NGINX
}

write_built_bundle() {
  mkdir -p "$TMP_DIR/dist/assets"
  cat > "$TMP_DIR/dist/assets/ReembolsosScreen-test.js" <<'JS'
const copy = "Los planes se pagan por adelantado y no se renuevan automáticamente. Al terminar la vigencia, se requiere una nueva compra para activar otro periodo.";
JS
}

write_react_screen
write_backend_contract

run_gate() {
  set +e
  gate_output="$(cd "$TMP_DIR" && env "${GATE_ENV[@]}" bash scripts/fixed-period-plan-copy-gate.sh 2>&1)"
  gate_status=$?
  set -e
}

expect_success() {
  local label="$1"
  run_gate
  if (( gate_status != 0 )); then
    echo "fixed-period copy gate rejected a compliant tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

expect_failure() {
  local label="$1" expected="$2"
  run_gate
  if (( gate_status == 0 )); then
    echo "fixed-period copy gate accepted a violating tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
  grep -qF "$expected" <<<"$gate_output" || {
    echo "fixed-period copy gate failed for the wrong reason: $label" >&2
    echo "$gate_output" >&2
    exit 1
  }
}

GATE_ENV=()
expect_success 'compliant source contract'
grep -qF 'mode: source' <<<"$gate_output"

cat > "$TMP_DIR/src/components/screens/legal/ReembolsosScreen.jsx" <<'JSX'
export default function ReembolsosScreen() {
  return <p>Los planes no se renuevan automáticamente y se requiere una nueva compra para activar otro periodo. La cancelación evita renovaciones posteriores.</p>;
}
JSX
expect_failure 'forbidden recurring-renewal copy in React' 'implies a recurring renewal/cancellation path'

write_react_screen
sed -i 's/no se renuevan automáticamente/no se renuevan/' "$TMP_DIR/src/components/screens/legal/ReembolsosScreen.jsx"
expect_failure 'React disclosure removed' 'missing the fixed-period disclosure'

write_react_screen
sed -i "/'reembolsos' =>/d" "$TMP_DIR/backend/config/public_seo.php"
expect_failure 'backend SEO route removed' '/reembolsos is missing from backend public SEO routing'

write_backend_contract
sed -i 's/|reembolsos//' "$TMP_DIR/default.conf"
expect_failure 'nginx decorated shell route removed' '/reembolsos is missing from the Laravel-decorated nginx shell route'

write_backend_contract
GATE_ENV=("REQUIRE_BUILT_ARTIFACT=1")
rm -rf "$TMP_DIR/dist"
expect_failure 'required build artifact absent' 'was not produced by the build'

write_built_bundle
expect_success 'compliant built bundle'
grep -qF 'Validated built refund-policy bundle' <<<"$gate_output"
grep -qF 'mode: built' <<<"$gate_output"

cat > "$TMP_DIR/dist/assets/ReembolsosScreen-test.js" <<'JS'
const copy = "Los planes no se renuevan automáticamente.";
JS
expect_failure 'built bundle loses one disclosure' 'built frontend bundle is missing the fixed-period refund disclosure'

write_built_bundle
printf '%s\n' 'const forbidden = "La cancelación evita renovaciones posteriores";' >> "$TMP_DIR/dist/assets/ReembolsosScreen-test.js"
expect_failure 'built bundle contains forbidden recurring-renewal copy' 'built frontend bundle implies a recurring renewal/cancellation path'

write_built_bundle
sed -i "s/'plan_expires_at' => now()->addMonth()/'plan_expires_at' => now()->addYear()/" "$TMP_DIR/backend/app/Http/Controllers/Api/PaymentController.php"
expect_failure 'payment implementation no longer fixed one-month period' 'payment implementation no longer proves a fixed one-month plan period'

echo 'fixed-period plan copy gate regression test OK'
