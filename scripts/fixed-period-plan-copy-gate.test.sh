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

write_react_screen() {
  cat > "$TMP_DIR/src/components/screens/legal/ReembolsosScreen.jsx" <<'JSX'
export default function ReembolsosScreen() {
  return <p>Los planes se pagan por adelantado y no se renuevan automáticamente. Al terminar la vigencia, se requiere una nueva compra para activar otro periodo.</p>;
}
JSX
}

write_react_screen

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

# The artifact-resolution mode is forced per case so this test is deterministic
# on every host, including the production checkout where the real frontend
# container is running: dist-mode cases point FRONTEND_CONTAINER at a container
# that cannot exist, and served-mode cases pass FRONTEND_SERVED_DOCUMENT.
ABSENT_CONTAINER="mercasto-frontend-container-absent-in-test"
GATE_ENV=()

use_dist_artifact() {
  GATE_ENV=("FRONTEND_CONTAINER=$ABSENT_CONTAINER")
}

use_served_document() {
  GATE_ENV=("FRONTEND_SERVED_DOCUMENT=$1")
}

use_required_built_artifact() {
  GATE_ENV=("REQUIRE_BUILT_ARTIFACT=1")
}

use_dist_artifact

run_gate() {
  set +e
  gate_output="$(env "${GATE_ENV[@]}" bash "$TMP_DIR/scripts/fixed-period-plan-copy-gate.sh" 2>&1)"
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
use_dist_artifact
expect_success 'compliant source without a build'
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
use_required_built_artifact
run_gate
if (( gate_status == 0 )); then
  echo 'fixed-period copy gate skipped the artifact under REQUIRE_BUILT_ARTIFACT=1' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'was not produced by the build' <<<"$gate_output"

# 7. The React screen losing the disclosure is still caught.
write_shipped_doc ''
use_dist_artifact
cat > "$TMP_DIR/src/components/screens/legal/ReembolsosScreen.jsx" <<'JSX'
export default function ReembolsosScreen() {
  return <p>Planes disponibles.</p>;
}
JSX
expect_nonzero 'React screen missing the disclosure'

# 8. The production incident that followed the first hardening: the checkout's
#    dist/ is a gitignored leftover holding the OLD copy, while the frontend
#    container serves the fixed document. The gate must assert the served
#    artifact and must not fail the required check on the stale leftover.
write_react_screen
write_shipped_doc ''
mkdir -p "$TMP_DIR/dist/reembolsos"
cat > "$TMP_DIR/dist/reembolsos/index.html" <<'HTML'
<section id="suscripciones"><h2>5. Suscripciones y cancelaciones</h2>
<p>La cancelación evita renovaciones posteriores, pero no devuelve automáticamente el importe.</p></section>
HTML
cat > "$TMP_DIR/served-reembolsos.html" <<'HTML'
<section id="suscripciones"><h2>5. Planes de cuenta y vigencia</h2>
<p>Los planes de cuenta disponibles actualmente se pagan por adelantado para el periodo indicado al momento de compra y no se renuevan automáticamente. Al terminar la vigencia, se requiere una nueva compra para activar otro periodo.</p></section>
HTML
grep -qF 'La cancelación evita renovaciones posteriores' "$TMP_DIR/dist/reembolsos/index.html"
use_served_document "$TMP_DIR/served-reembolsos.html"
expect_success 'stale dist with a compliant served copy'
grep -qF 'Validated served artifact: served /reembolsos document' <<<"$gate_output"
grep -qF 'is not a build of the current source' <<<"$gate_output"

# 9. The served copy is genuinely asserted, not skipped: forbidden copy in what
#    the container serves must fail.
cat > "$TMP_DIR/served-reembolsos.html" <<'HTML'
<section><p>Los planes no se renuevan automáticamente y se requiere una nueva compra para activar otro periodo.</p>
<p>La cancelación evita renovaciones posteriores.</p></section>
HTML
use_served_document "$TMP_DIR/served-reembolsos.html"
expect_failure 'forbidden copy in the served document' 'implies a recurring renewal/cancellation path'

# 10. A served copy that silently loses the fixed-period disclosure must fail.
cat > "$TMP_DIR/served-reembolsos.html" <<'HTML'
<section><p>Los planes se pagan por adelantado.</p></section>
HTML
use_served_document "$TMP_DIR/served-reembolsos.html"
expect_failure 'served document missing the disclosure' 'missing the fixed-period disclosure'

# 11. An explicit served path that does not exist fails loudly instead of falling
#     back to the (stale) local dist.
use_served_document "$TMP_DIR/absent-reembolsos.html"
expect_failure 'served document path missing' 'could not be read'

# 12. REQUIRE_BUILT_ARTIFACT=1 outranks a served copy: the build job cannot be
#     redirected away from the artifact it just produced.
use_required_built_artifact
expect_failure 'CI build mode ignores the served copy' 'missing the fixed-period disclosure'

# 13. A running frontend container that no longer serves the document is a
#     production defect: the gate must fail instead of falling back to a local
#     dist. A stub docker binary makes this deterministic on every host.
mkdir -p "$TMP_DIR/bin"
cat > "$TMP_DIR/bin/docker" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  inspect) printf 'true\n' ;;
  cp) exit 1 ;;
  *) exit 1 ;;
esac
SH
chmod +x "$TMP_DIR/bin/docker"
write_react_screen
write_shipped_doc ''
rm -rf "$TMP_DIR/dist"
set +e
gate_output="$(env PATH="$TMP_DIR/bin:$PATH" bash "$TMP_DIR/scripts/fixed-period-plan-copy-gate.sh" 2>&1)"
gate_status=$?
set -e
if (( gate_status == 0 )); then
  echo 'fixed-period copy gate ignored a running container that serves no document' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'Refusing to fall back to a local build directory' <<<"$gate_output"

# 14. A container that is not running falls back to the local artifact, and with
#     neither available the gate is explicit that no artifact was inspected.
cat > "$TMP_DIR/bin/docker" <<'SH'
#!/usr/bin/env bash
printf 'false\n'
SH
chmod +x "$TMP_DIR/bin/docker"
set +e
gate_output="$(env PATH="$TMP_DIR/bin:$PATH" bash "$TMP_DIR/scripts/fixed-period-plan-copy-gate.sh" 2>&1)"
gate_status=$?
set -e
if (( gate_status != 0 )); then
  echo 'fixed-period copy gate rejected a source-only tree with no reachable artifact' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'mode: none' <<<"$gate_output"

echo 'fixed-period plan copy gate regression test OK'
