#!/usr/bin/env bash
set -euo pipefail

MIGRATION='backend/database/migrations/2026_09_09_150000_enforce_case_insensitive_user_email_identity.php'
HELPER='backend/app/Support/EmailIdentity.php'
AUTH='backend/app/Http/Controllers/Api/AuthController.php'
PROFILE='backend/app/Http/Controllers/Api/ProfileController.php'
BOOTSTRAP='backend/bootstrap/app.php'
TEST='backend/tests/Feature/EmailIdentityIntegrityTest.php'

for file in "$MIGRATION" "$HELPER" "$AUTH" "$PROFILE" "$BOOTSTRAP" "$TEST"; do
  test -f "$file"
done

grep -qF 'users_email_case_insensitive_unique' "$MIGRATION"
grep -qF 'email_case_legacy_exempt' "$MIGRATION"
grep -qF 'ROW_NUMBER() OVER' "$MIGRATION"
grep -qF 'users_email_case_promote_legacy' "$MIGRATION"
grep -qF 'EmailIdentity::exists' "$AUTH"
grep -qF 'EmailIdentity::matches' "$AUTH"
grep -qF 'EmailIdentity::resolveLogin' "$AUTH"
grep -qF 'EmailIdentity::normalize' "$AUTH"
grep -qF 'oauth_email_ambiguous' "$AUTH"
grep -qF 'EmailIdentity::exists' "$PROFILE"
grep -qF 'users_email_case_insensitive_unique' "$BOOTSTRAP"
grep -qF 'test_registration_normalizes_email_and_login_is_case_insensitive' "$TEST"
grep -qF 'test_legacy_ambiguous_identity_requires_exact_historical_spelling_for_login' "$TEST"
grep -qF 'test_database_unique_index_blocks_direct_case_variant_insert' "$TEST"
grep -qF 'test_legacy_duplicate_is_promoted_when_identity_owner_is_deleted' "$TEST"

echo 'email case identity gate OK'
