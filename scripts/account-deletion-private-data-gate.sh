#!/usr/bin/env bash
set -euo pipefail
DELETE='backend/app/Http/Controllers/Api/AccountDeletionController.php'
PROFILE='backend/app/Http/Controllers/Api/ProfileController.php'
JOB='backend/app/Jobs/PreScreenKycDocumentWithAI.php'
TEST='backend/tests/Feature/AccountDeletionPrivateDataTest.php'
REAUTH='backend/app/Support/SensitiveActionReauth.php'
REAUTH_TEST='backend/tests/Feature/AccountDeletionReauthTest.php'
APP='src/App.jsx'
PROFILE_UI='src/components/screens/ProfileEditScreen.jsx'
AUTH_E2E='tests/e2e/auth-flow.spec.js'
PROFILE_E2E='tests/e2e/profile-edit-localization.spec.js'

echo '== Account deletion private-data gate =='
grep -qF "store('kyc_documents', 'local')" "$PROFILE"
grep -qF "Storage::disk('local')->delete(\$user->kyc_document_url)" "$DELETE"
grep -qF "Storage::disk('local')->delete(\$user->business_csf_url)" "$DELETE"
grep -qF "DB::table('messages')->where('sender_id', \$user->id)->orWhere('receiver_id', \$user->id)->delete()" "$DELETE"
grep -qF "DB::table('conversations')->where('buyer_id', \$user->id)->orWhere('seller_id', \$user->id)->delete()" "$DELETE"
grep -qF "DB::table('user_notifications')->where('user_id', \$user->id)->delete()" "$DELETE"
grep -qF 'parseContent($disk->get($user->kyc_document_url))' "$JOB"
test -s "$TEST"
test -s "$REAUTH_TEST"
grep -qF 'SensitiveActionReauth::passes($request, $user' "$DELETE"
grep -qF "'code' => 'password_confirmation_required'" "$DELETE"
grep -qF "'code' => 'reauthentication_required'" "$DELETE"
grep -qF "window.prompt(t.curr_password" "$APP"
grep -qF "data.code === 'password_confirmation_required'" "$APP"
grep -qF "data.code === 'reauthentication_required'" "$APP"
grep -qF 'data-testid="profile-delete-password"' "$PROFILE_UI"
grep -qF "data.code === 'password_confirmation_required'" "$PROFILE_UI"
grep -qF 'response.status() === 200' "$AUTH_E2E"
grep -qF "page.getByTestId('profile-delete-password')" "$PROFILE_E2E"
grep -qF "expect(deleteRequests).toBe(1)" "$PROFILE_E2E"
echo 'account deletion private-data gate OK'
