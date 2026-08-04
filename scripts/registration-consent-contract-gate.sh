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

echo "== Registration consent contract gate =="

for file in "$CONTROLLER" "$CONFIG" "$MODEL" "$MIGRATION" "$TEST" "$CHANNEL_TEST" "$WEB" "$APP"; do
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

echo "registration consent contract gate OK"
