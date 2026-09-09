#!/usr/bin/env bash
set -euo pipefail

SERVICE='backend/app/Services/GamificationService.php'
TEST='backend/tests/Feature/GamificationReferralProgressTest.php'

test -f "$SERVICE"
test -f "$TEST"

grep -qF "DB::table('referrals')" "$SERVICE"
grep -qF -- "->where('referrer_id', \$user->id)" "$SERVICE"
if grep -qF 'waitlist_subscribers' "$SERVICE"; then
  echo 'stale waitlist_subscribers referral source found in GamificationService' >&2
  exit 1
fi
grep -qF 'test_referral_progress_uses_current_referrals_table' "$TEST"

echo 'gamification referral contract gate OK'
