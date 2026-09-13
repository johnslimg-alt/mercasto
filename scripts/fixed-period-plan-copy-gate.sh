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
# verbatim, so the document that ships comes from:
#
#   public/reembolsos/index.html  ->  dist/reembolsos/index.html  ->  frontend image
#
# The previous revision of this gate only grepped ReembolsosScreen.jsx, which is
# how the forbidden "recurring renewal / cancellation" wording survived on the
# live page for months while the gate stayed green.
#
# WHICH ARTIFACT IS ASSERTED (resolved in this order)
# ---------------------------------------------------
#   1. REQUIRE_BUILT_ARTIFACT=1  ->  dist/reembolsos/index.html. CI sets this
#      immediately after `npm run build`, so the freshly emitted artifact must
#      exist, satisfy the copy contract, AND be byte-identical to public/. This
#      mode can never be satisfied by a served copy: it is the source -> build
#      equality check.
#   2. FRONTEND_SERVED_DOCUMENT=<path>  ->  that file (explicit override used by
#      the regression test and by operators).
#   3. A running frontend container  ->  the document served at
#      $FRONTEND_HTML_ROOT/reembolsos/index.html, copied out with `docker cp`.
#      This is what visitors actually receive.
#   4. Otherwise, dist/reembolsos/index.html when it exists locally.
#   5. Otherwise no artifact is inspected (source-only) and the gate says so.
#
# Why the served copy outranks a local dist/ on a host: `dist/` is gitignored
# and is NOT mounted into the frontend container, which serves from its own
# image. On the production checkout it is therefore a leftover from whenever
# somebody last ran `npm run build` there, and asserting it made this gate fail
# for every pull request while production served correct copy. The artifact that
# matters is the one users receive, so that is the artifact validated on a host
# that has the container; the byte-equality invariant against public/ remains
# hard in the build job that actually produces dist/.
SHIPPED_SRC="public/reembolsos/index.html"
SHIPPED_DIST="dist/reembolsos/index.html"
FRONTEND_CONTAINER="${FRONTEND_CONTAINER:-mercasto_frontend_container}"
FRONTEND_HTML_ROOT="${FRONTEND_HTML_ROOT:-/usr/share/nginx/html}"
SERVED_DOCUMENT_RELATIVE="reembolsos/index.html"

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

# Prints the path of a local copy of the document the frontend container serves,
# or nothing when no served artifact can be reached. The caller owns the file.
resolve_served_document() {
  if [ -n "${FRONTEND_SERVED_DOCUMENT:-}" ]; then
    printf '%s' "$FRONTEND_SERVED_DOCUMENT"
    return 0
  fi

  command -v docker >/dev/null 2>&1 || return 1
  if [ "$(docker inspect -f '{{.State.Running}}' "$FRONTEND_CONTAINER" 2>/dev/null)" != "true" ]; then
    return 1
  fi

  local copy
  copy="$(mktemp "${TMPDIR:-/tmp}/mercasto-served-document.XXXXXX")"
  if ! docker cp "$FRONTEND_CONTAINER:$FRONTEND_HTML_ROOT/$SERVED_DOCUMENT_RELATIVE" "$copy" >/dev/null 2>&1; then
    rm -f "$copy"
    # The container is running, so the document it should be serving is
    # unreadable: that is a production defect, not a reason to fall back to a
    # local build directory.
    return 2
  fi
  printf '%s' "$copy"
}

assert_built_artifact() {
  if [ ! -f "$SHIPPED_DIST" ]; then
    echo "FAIL: REQUIRE_BUILT_ARTIFACT=1 but $SHIPPED_DIST was not produced by the build" >&2
    exit 1
  fi
  assert_fixed_period_copy "$SHIPPED_DIST" "built /reembolsos artifact"
  if ! cmp -s "$SHIPPED_SRC" "$SHIPPED_DIST"; then
    echo "FAIL: built artifact diverges from the deployed source it is copied from" >&2
    echo "      $SHIPPED_SRC != $SHIPPED_DIST" >&2
    exit 1
  fi
}

cleanup_served_document() {
  if [ -n "${CLEANUP_SERVED_DOCUMENT:-}" ]; then
    rm -f "$CLEANUP_SERVED_DOCUMENT"
  fi
}
trap cleanup_served_document EXIT

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
assert_fixed_period_copy "$SHIPPED_SRC" "shipped /reembolsos document (public/ -> image verbatim)"

ARTIFACT_MODE=""
CLEANUP_SERVED_DOCUMENT=""

if [ "${REQUIRE_BUILT_ARTIFACT:-0}" = "1" ]; then
  ARTIFACT_MODE="built"
  ARTIFACT_LABEL="freshly built $SHIPPED_DIST (byte-identical to $SHIPPED_SRC)"
  assert_built_artifact
  echo "Validated built artifact: $ARTIFACT_LABEL"
else
  set +e
  served_document="$(resolve_served_document)"
  served_status=$?
  set -e

  if (( served_status == 2 )); then
    echo "FAIL: $FRONTEND_CONTAINER is running but it does not serve" >&2
    echo "      $FRONTEND_HTML_ROOT/$SERVED_DOCUMENT_RELATIVE (the live /reembolsos page" >&2
    echo "      would be missing). Refusing to fall back to a local build directory." >&2
    exit 1
  fi

  if (( served_status == 0 )) && [ -n "$served_document" ]; then
    ARTIFACT_MODE="served"
    if [ ! -f "$served_document" ]; then
      echo "FAIL: the served /reembolsos document could not be read: $served_document" >&2
      echo "      FRONTEND_SERVED_DOCUMENT pointed at a path that does not exist" >&2
      exit 1
    fi
    if [ -z "${FRONTEND_SERVED_DOCUMENT:-}" ]; then
      CLEANUP_SERVED_DOCUMENT="$served_document"
      ARTIFACT_LABEL="served /reembolsos document ($FRONTEND_CONTAINER:$FRONTEND_HTML_ROOT/$SERVED_DOCUMENT_RELATIVE)"
    else
      ARTIFACT_LABEL="served /reembolsos document (FRONTEND_SERVED_DOCUMENT=$served_document)"
    fi
    assert_fixed_period_copy "$served_document" "$ARTIFACT_LABEL"
    echo "Validated served artifact: $ARTIFACT_LABEL"
    if [ -f "$SHIPPED_DIST" ] && ! cmp -s "$SHIPPED_SRC" "$SHIPPED_DIST"; then
      echo "NOTE: the checkout's $SHIPPED_DIST is not a build of the current source and is NOT" >&2
      echo "      the artifact that is served (dist/ is gitignored and is not mounted into the" >&2
      echo "      frontend container). The served copy asserted above is authoritative; CI" >&2
      echo "      asserts source -> dist equality in the frontend-build job with" >&2
      echo "      REQUIRE_BUILT_ARTIFACT=1." >&2
    fi
  elif [ -f "$SHIPPED_DIST" ]; then
    ARTIFACT_MODE="built"
    ARTIFACT_LABEL="local build $SHIPPED_DIST (byte-identical to $SHIPPED_SRC)"
    assert_built_artifact
    echo "Validated built artifact: $ARTIFACT_LABEL"
  else
    ARTIFACT_MODE="none"
    ARTIFACT_LABEL="no built or served artifact available"
    echo "NOTE: no built or served artifact available here; only the source contract above was" >&2
    echo "      asserted. CI asserts the built artifact in the frontend-build job" >&2
    echo "      (REQUIRE_BUILT_ARTIFACT=1); a host with the frontend container asserts the" >&2
    echo "      served copy." >&2
  fi
fi

echo "fixed-period plan copy gate OK (mode: $ARTIFACT_MODE; artifact: $ARTIFACT_LABEL)"
