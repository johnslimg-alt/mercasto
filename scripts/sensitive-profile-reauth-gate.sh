#!/usr/bin/env bash
set -euo pipefail

HELPER='backend/app/Support/SensitiveActionReauth.php'
PROFILE='backend/app/Http/Controllers/Api/ProfileController.php'
AUTH='backend/app/Http/Controllers/Api/AuthController.php'
PROVIDER='backend/app/Providers/AppServiceProvider.php'
ROUTES='backend/routes/api.php'
UNIT_TEST='backend/tests/Unit/SensitiveActionReauthTest.php'
BOUNDARY_TEST='backend/tests/Feature/SensitiveProfileReauthBoundaryTest.php'
TRANSLATIONS='src/constants/twoFactorReauthTranslations.js'
APP='src/App.jsx'
PROFILE_SCREEN='src/components/screens/ProfileEditScreen.jsx'

for file in "$HELPER" "$PROFILE" "$AUTH" "$PROVIDER" "$ROUTES" "$UNIT_TEST" "$BOUNDARY_TEST" "$TRANSLATIONS" "$APP" "$PROFILE_SCREEN"; do
  test -f "$file"
done

grep -qF 'RECENT_TOKEN_MINUTES = 5' "$HELPER"
grep -qF 'currentAccessToken()' "$HELPER"
grep -qF 'SensitiveActionReauth::passes' "$PROFILE"
grep -qF 'SensitiveActionReauth::hasPassword' "$PROFILE"
grep -qF '$user->password = null;' "$AUTH"
grep -qF 'RateLimiter::for("sensitive-profile"' "$PROVIDER"
grep -qF 'RateLimiter::for("email-change"' "$PROVIDER"
grep -qF 'throttle:sensitive-profile' "$ROUTES"
grep -qF 'throttle:email-change' "$ROUTES"
! grep -qF '$isOAuthUser' "$PROFILE"
! grep -qF '$isPhoneAuthUser' "$PROFILE"
test "$(grep -c 'sensitive_reauth_login_required:' "$TRANSLATIONS")" -eq 11
test "$(grep -c "data.code === 'reauthentication_required'" "$APP")" -eq 2
grep -qF "data.code === 'reauthentication_required'" "$PROFILE_SCREEN"
grep -qF 'reauthentication_required' "$BOUNDARY_TEST"
grep -qF 'test_passwordless_recent_token_window' "$UNIT_TEST"

echo 'sensitive profile reauth gate OK'
