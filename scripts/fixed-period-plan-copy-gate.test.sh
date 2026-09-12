#!/usr/bin/env bash
# Negative controls for scripts/fixed-period-plan-copy-gate.sh.
#
# The gate this replaces only inspected src/components/screens/legal/ReembolsosScreen.jsx,
# so it stayed green while the string it forbids shipped in
# public/reembolsos/index.html (copied verbatim into dist/ and served at
# GET /reembolsos/). These fixtures prove the hardened gate fails on the shipped
# artifact and on a missing/divergent build output.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-fixed-period.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/scripts" \
  "$TMP_DIR/src/components/screens/legal" \
  "$TMP_DIR/backend/app/Http/Controllers/Api" \
  "$TMP_DIR/docs/legal" \
  "$TMP_DIR/public/reembolsos"

cp "$ROOT_DIR/scripts/fixed-period-plan-copy-gate.sh" "$TMP_DIR/scripts/"

cat > "$TMP_DIR/src/components/screens/legal/ReembolsosScreen.jsx" <<'JSX'
export default function ReembolsosScreen() {
  return <p>Los planes se pagan por adelantado y no se renuevan automáticamente. Al terminar la vigencia, se requiere una nueva compra para activar otro periodo.</p>;
}
JSX

cat > "$TMP_DIR/backend/app/Http/Controllers/Api/PaymentController.php" <<'PHP'
<?php
'plan_expires_at' => now()->addMonth()
PHP

cat > "$TMP_DIR/docs/legal/MEXICO_LEGAL_SOURCE_REVIEW_2026-08-28.md" <<'MD'
no automatic renewal/recurring-charge path is implemented
MD

write_shipped_doc() {
  cat > "$TMP_DIR/public/reembolsos/index.html" <<HTML
<section id="suscripciones">
  <h2>5. Planes de cuenta y vigencia</h2>
  <p>Los planes de cuenta disponibles actualmente se pagan por adelantado para el periodo indicado al momento de compra y no se renuevan automáticamente. Al terminar la vigencia, se requiere una nueva compra para activar otro periodo.</p>
  $1
</section>
HTML
}

run_gate() {
  set +e
  gate_output="$(bash "$TMP_DIR/scripts/fixed-period-plan-copy-gate.sh" 2>&1)"
  gate_status=$?
  set -e
}

expect_failure() {
  local label="$1" expected="$2"
  run_gate
  if (( gate_status == 0 )); then
    echo "fixed-period copy gate accepted a violating tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
  if ! grep -qF "$expected" <<<"$gate_output"; then
    echo "fixed-period copy gate failed for the wrong reason: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

expect_nonzero() {
  local label="$1"
  run_gate
  if (( gate_status == 0 )); then
    echo "fixed-period copy gate accepted a violating tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

# 1. Correct copy in the shipped document passes without a build present.
write_shipped_doc ''
run_gate
if (( gate_status != 0 )); then
  echo 'fixed-period copy gate rejected the compliant fixture' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'fixed-period plan copy gate OK' <<<"$gate_output"

# 2. The live defect: the forbidden renewal/cancellation claim is back in the
#    document that actually ships. The React screen stays clean, exactly like the
#    production incident this hardening exists for.
write_shipped_doc '<p>La cancelación evita renovaciones posteriores, pero no devuelve automáticamente el importe.</p>'
expect_failure 'forbidden copy in the shipped document' 'implies a recurring renewal/cancellation path'

# 3. The shipped document silently loses the fixed-period disclosure.
write_shipped_doc ''
sed -i 's/no se renuevan automáticamente/no se renuevan/' "$TMP_DIR/public/reembolsos/index.html"
expect_failure 'shipped document missing the fixed-period disclosure' 'missing the fixed-period disclosure'

# 4. A build exists whose emitted page diverges from its public/ source even
#    though the copy itself is compliant.
write_shipped_doc ''
mkdir -p "$TMP_DIR/dist/reembolsos"
sed 's|</section>|</section><!-- stale build marker -->|' \
  "$TMP_DIR/public/reembolsos/index.html" > "$TMP_DIR/dist/reembolsos/index.html"
expect_failure 'built artifact diverges from public/ source' 'diverges from the deployed source'

# 5. A build exists and the emitted page carries the forbidden claim.
write_shipped_doc ''
cp "$ROOT_DIR/public/reembolsos/index.html" "$TMP_DIR/dist/reembolsos/index.html"
printf '<p>La cancelación evita renovaciones posteriores</p>\n' >> "$TMP_DIR/dist/reembolsos/index.html"
expect_failure 'forbidden copy in the built artifact' 'implies a recurring renewal/cancellation path'
rm -rf "$TMP_DIR/dist"

# 6. A job that builds must not silently skip the artifact when the build output
#    is missing.
write_shipped_doc ''
set +e
gate_output="$(REQUIRE_BUILT_ARTIFACT=1 bash "$TMP_DIR/scripts/fixed-period-plan-copy-gate.sh" 2>&1)"
gate_status=$?
set -e
if (( gate_status == 0 )); then
  echo 'fixed-period copy gate skipped the artifact under REQUIRE_BUILT_ARTIFACT=1' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'was not produced by the build' <<<"$gate_output"

# 7. The React screen losing the disclosure is still caught.
write_shipped_doc ''
cat > "$TMP_DIR/src/components/screens/legal/ReembolsosScreen.jsx" <<'JSX'
export default function ReembolsosScreen() {
  return <p>Planes disponibles.</p>;
}
JSX
expect_nonzero 'React screen missing the disclosure'

echo 'fixed-period plan copy gate regression test OK'
