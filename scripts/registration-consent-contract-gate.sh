#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/AuthController.php"
CONFIG="backend/config/legal.php"
MODEL="backend/app/Models/UserConsent.php"
MIGRATION="backend/database/migrations/2026_08_03_220000_create_user_consents_table.php"
TEST="backend/tests/Feature/RegistrationConsentTest.php"
CHANNEL_TEST="backend/tests/Feature/RegistrationConsentChannelsTest.php"
WEB="src/utils/registrationConsent.js"
APP="src/App.jsx"
PROBE="scripts/registration-consent-contract.mjs"

# What this gate proves, and what it does not
# -------------------------------------------
# The `grep -qF` block below is wiring only: it proves that the consent fields,
# the validation call, the one-time OAuth consent state and the frontend call
# sites are still present in the files that own them. Absence assertions of that
# kind are cheap and genuinely structural, but on their own they cannot tell a
# working registration flow from a stub file that merely contains the strings.
#
# The executed parts are:
#   1. `node scripts/registration-consent-contract.mjs` imports the real
#      src/utils/registrationConsent.js and asserts the payload it builds (fields,
#      canonical timestamp, fail-closed measurement consent, OAuth hand-off URL),
#      cross-checked against the versions backend/config/legal.php accepts.
#   2. The real backend feature tests run against the routed /api/register and
#      OAuth endpoints when a backend runtime is present (backend/vendor +
#      phpunit). CI provides one and sets CONSENT_GATE_REQUIRE_RUNTIME=1, so the
#      contract is executed, not described, on every pull request.
#
# What it still does NOT prove: that the browser sends the payload the module
# builds (no browser is involved), and that a real database row is written in
# production. Those are covered by the PHPUnit feature tests (row-level
# assertions through the routed controller) and by production QA, not here.

echo "== Registration consent contract gate =="

for file in "$CONTROLLER" "$CONFIG" "$MODEL" "$MIGRATION" "$TEST" "$CHANNEL_TEST" "$WEB" "$APP" "$PROBE"; do
  test -f "$file"
done

grep -qF "'age_confirmed' => ['required', 'accepted']" "$CONTROLLER"
grep -qF "legal.registration_consent.terms_version" "$CONTROLLER"
grep -qF "legal.registration_consent.privacy_version" "$CONTROLLER"
grep -qF "max_future_skew_minutes" "$CONTROLLER"
grep -qF "accepted_at' => \$acceptedAt" "$CONTROLLER"
grep -qF "client_accepted_at" "$CONTROLLER"
grep -qF "ip_hash" "$CONTROLLER"
grep -qF "user_agent_hash" "$CONTROLLER"
grep -qF "'terms_version' => '2026-08-03'" "$CONFIG"
grep -qF "'privacy_version' => '2026-08-03'" "$CONFIG"
grep -qF "terms: '2026-08-03'" "$WEB"
grep -qF "privacy: '2026-08-03'" "$WEB"
grep -qF "test_registration_without_consent_is_rejected" "$TEST"
grep -qF "test_registration_rejects_unknown_document_versions" "$TEST"
grep -qF "test_registration_rejects_a_client_timestamp_too_far_in_the_future" "$TEST"
grep -qF "validateRegistrationConsent(\$request)" "$CONTROLLER"
grep -qF "cacheOAuthRegistrationConsent" "$CONTROLLER"
grep -qF "pullOAuthRegistrationConsent" "$CONTROLLER"
grep -qF "oauth_registration_consent:" "$CONTROLLER"
grep -qF "registration_consent_required" "$CONTROLLER"
grep -qF "private function validateRegistrationConsent" "$CONTROLLER"
grep -qF "test_new_phone_account_requires_consent" "$CHANNEL_TEST"
grep -qF "test_new_telegram_account_requires_consent" "$CHANNEL_TEST"
grep -qF "test_new_oauth_account_requires_one_time_consent_state" "$CHANNEL_TEST"
grep -qF "createOAuthRegistrationUrl" "$WEB"
grep -qF "registrationConsentAccepted" "$APP"
grep -qF "pendingPhoneRegistrationConsent" "$APP"
grep -qF "handleOAuthStart('google')" "$APP"
grep -qF "...(registrationConsent || {})" "$APP"

if grep -qF "'age_confirmed' => 'sometimes|accepted'" "$CONTROLLER"; then
  echo "Registration consent must not be optional." >&2
  exit 1
fi

if grep -qF "legacy_registration_without_consent_remains_supported" "$TEST"; then
  echo "Legacy no-consent registration coverage must not be restored." >&2
  exit 1
fi

# --- executed: frontend consent payload contract ---------------------------
BACKEND_TERMS_VERSION="$(sed -nE "s/.*'terms_version'[[:space:]]*=>[[:space:]]*'([^']+)'.*/\1/p" "$CONFIG" | head -n 1)"
BACKEND_PRIVACY_VERSION="$(sed -nE "s/.*'privacy_version'[[:space:]]*=>[[:space:]]*'([^']+)'.*/\1/p" "$CONFIG" | head -n 1)"

if [ -z "$BACKEND_TERMS_VERSION" ] || [ -z "$BACKEND_PRIVACY_VERSION" ]; then
  echo "FAIL: could not read the accepted legal document versions from $CONFIG" >&2
  exit 1
fi

CONSENT_BACKEND_TERMS_VERSION="$BACKEND_TERMS_VERSION" \
CONSENT_BACKEND_PRIVACY_VERSION="$BACKEND_PRIVACY_VERSION" \
  node "$PROBE"

# --- executed: routed backend consent contract -----------------------------
PHPUNIT="backend/vendor/bin/phpunit"
CONSENT_CONTRACT_EXECUTED=0
if [ -x "$PHPUNIT" ]; then
  # Deterministic, non-secret test key. Identical to the APP_KEY used by
  # .github/workflows/backend-tests.yml; the suite only needs a valid key length.
  if ! APP_KEY="${APP_KEY:-base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=}" \
       APP_ENV="${APP_ENV:-testing}" \
       "$PHPUNIT" -c backend/phpunit.xml --filter 'RegistrationConsent'
  then
    echo "FAIL: the routed registration consent feature tests failed" >&2
    exit 1
  fi
  CONSENT_CONTRACT_EXECUTED=1
elif [ "${CONSENT_GATE_REQUIRE_RUNTIME:-0}" = "1" ]; then
  echo "FAIL: CONSENT_GATE_REQUIRE_RUNTIME=1 but $PHPUNIT is not installed" >&2
  echo "      run composer install in backend/ (CI does this in the" >&2
  echo "      'registration-consent-contract' job of production-checks.yml)" >&2
  exit 1
else
  echo "NOTE: backend runtime not installed; the routed /api/register consent" >&2
  echo "      contract was NOT executed in this invocation (static + frontend" >&2
  echo "      payload checks only). CI executes it via CONSENT_GATE_REQUIRE_RUNTIME=1." >&2
fi

# The executed tier above only exists while CI keeps asking for it. If that job
# disappears, the gate must say so instead of quietly degrading to text checks.
if ! grep -rqF 'CONSENT_GATE_REQUIRE_RUNTIME=1' .github/workflows/; then
  echo "FAIL: no CI job executes the backend registration consent contract" >&2
  echo "      expected a workflow step running this gate with CONSENT_GATE_REQUIRE_RUNTIME=1" >&2
  exit 1
fi

if (( CONSENT_CONTRACT_EXECUTED == 1 )); then
  echo "registration consent contract gate OK (routed backend contract executed)"
else
  echo "registration consent contract gate OK (backend contract NOT executed here)"
fi
