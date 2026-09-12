#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SESSION_CONFIG="backend/config/session.php"

# How this gate derives the production-effective value of session.secure
# ---------------------------------------------------------------------
# `'secure' => ...` in backend/config/session.php is the value Laravel hands to
# the session cookie. Production runs this same file with its own environment,
# so the effective value is decided by:
#
#   1. which environment variable the `secure` binding reads (it must be
#      SESSION_SECURE_COOKIE, the variable consumed by the production template);
#   2. the value every production env source in this repository assigns to that
#      variable (backend/.env.production.example is the deploy template;
#      compose/CI files are checked too, because any of them can leak into the
#      container environment);
#   3. the fallback baked into config/session.php for when the variable is
#      absent. A missing variable must fail closed in production: an unset
#      `env('SESSION_SECURE_COOKIE')` returns null, which makes the cookie
#      non-HTTPS-only, so the binding must carry a production-safe default.
#
# Point 3 is asserted here because a check that only proves the key "exists"
# stays green while production silently loses the Secure attribute.
#
# The live counterpart of this derivation is
# scripts/production-session-security-smoke.sh, which reads config('session.secure')
# inside the production container and asserts it is true; this gate fails if that
# runtime probe is unwired from CI.
PROD_ENV_TEMPLATE="backend/.env.production.example"
SECURE_DEFAULT_PATTERN="env\('SESSION_SECURE_COOKIE',[[:space:]]*(true|env\('APP_ENV',[[:space:]]*'production'\)[[:space:]]*===[[:space:]]*'production')\)"

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Session config scan =="

test -f "$SESSION_CONFIG"

grep -q "'secure' =>" "$SESSION_CONFIG"
grep -q "'http_only' =>" "$SESSION_CONFIG"
grep -q "'same_site' =>" "$SESSION_CONFIG"
grep -q "'domain' =>" "$SESSION_CONFIG"
grep -q "'driver' =>" "$SESSION_CONFIG"
grep -q "'lifetime' =>" "$SESSION_CONFIG"

# 1. The secure binding must read the variable the production template sets.
SECURE_BINDING="$(grep -E "^[[:space:]]*'secure'[[:space:]]*=>" "$SESSION_CONFIG" | head -n 1)"
if [ -z "$SECURE_BINDING" ]; then
  echo "FAIL: backend/config/session.php has no 'secure' binding" >&2
  exit 1
fi
if ! grep -qF "env('SESSION_SECURE_COOKIE'" <<<"$SECURE_BINDING"; then
  echo "FAIL: session.secure is not bound to SESSION_SECURE_COOKIE" >&2
  echo "      binding: $SECURE_BINDING" >&2
  exit 1
fi

# 3. Missing variable must still resolve to a Secure cookie in production.
if ! grep -qE "$SECURE_DEFAULT_PATTERN" <<<"$SECURE_BINDING"; then
  echo "FAIL: session.secure has no production-safe default" >&2
  echo "      binding: $SECURE_BINDING" >&2
  echo "      if SESSION_SECURE_COOKIE is missing from the production environment, this" >&2
  echo "      resolves to null and the session cookie stops being HTTPS-only." >&2
  echo "      expected default: true, or env('APP_ENV', 'production') === 'production'" >&2
  exit 1
fi

# 2. Every production env source that assigns the variable must assign true.
if [ ! -f "$PROD_ENV_TEMPLATE" ]; then
  echo "FAIL: production environment template is missing: $PROD_ENV_TEMPLATE" >&2
  exit 1
fi
if ! grep -qE "^[[:space:]]*SESSION_SECURE_COOKIE[[:space:]]*=[[:space:]]*true[[:space:]]*$" "$PROD_ENV_TEMPLATE"; then
  echo "FAIL: $PROD_ENV_TEMPLATE must set SESSION_SECURE_COOKIE=true" >&2
  grep -nE '^[[:space:]]*SESSION_SECURE_COOKIE' "$PROD_ENV_TEMPLATE" >&2
  exit 1
fi

mapfile -t secure_assignments < <(
  grep -rnE '^[[:space:]]*SESSION_SECURE_COOKIE[[:space:]]*=' \
    --include='.env*' --include='*.yml' --include='*.yaml' --include='Dockerfile*' \
    --include='*.conf' --include='*.env' \
    backend docker-compose.yml docker-compose.override.yml .github default.conf 2>/dev/null || true
)
for assignment in "${secure_assignments[@]}"; do
  if ! grep -qE '^[^:]+:[0-9]+:[[:space:]]*SESSION_SECURE_COOKIE[[:space:]]*=[[:space:]]*true[[:space:]]*$' <<<"$assignment"; then
    echo "FAIL: an environment source disables the Secure session cookie" >&2
    echo "      $assignment" >&2
    exit 1
  fi
done

# 4. The live runtime assertion must stay wired into CI: the derivation above is
#    only true if production really runs with these values.
if ! grep -qF 'bash scripts/production-session-security-smoke.sh' .github/workflows/production-live-gates.yml; then
  echo "FAIL: the production runtime session.secure probe is no longer run by CI" >&2
  echo "      expected .github/workflows/production-live-gates.yml to execute" >&2
  echo "      scripts/production-session-security-smoke.sh, which asserts" >&2
  echo "      config('session.secure') === true inside the production container" >&2
  exit 1
fi

echo "session config scan OK"
