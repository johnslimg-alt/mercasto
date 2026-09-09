#!/usr/bin/env bash
set -euo pipefail

SERVICE='backend/app/Services/GamificationService.php'
AUTH='backend/app/Http/Controllers/Api/AuthController.php'
REVIEW='backend/app/Http/Controllers/Api/ReviewController.php'
TEST='backend/tests/Feature/GamificationReviewMilestoneTest.php'
XP_UNIQUE_MIGRATION='backend/database/migrations/2026_09_09_220000_enforce_user_xp_user_uniqueness.php'
SCHEMA_TEST='backend/tests/Feature/GamificationSchemaAdoptionTest.php'

for file in "$SERVICE" "$AUTH" "$REVIEW" "$TEST" "$XP_UNIQUE_MIGRATION" "$SCHEMA_TEST"; do
  test -f "$file"
done

! grep -qF "'reviews_count' => 0" "$SERVICE"
! grep -qF "'five_star_reviews' => 0" "$SERVICE"
! grep -qF "'user_position' => 1" "$SERVICE"
grep -qF -- "->where('seller_id', \$user->id)" "$SERVICE"
grep -qF -- "->where('rating', 5)" "$SERVICE"
grep -qF "\$requirementType === 'user_position'" "$SERVICE"
grep -qF "\$currentProgress <= \$requirement" "$SERVICE"
grep -qF 'syncGamificationAfterAuthentication' "$AUTH"
test "$(grep -cF 'syncGamificationAfterAuthentication($user);' "$AUTH")" -eq 6
grep -qF "recordActivity(\$user, 'login')" "$AUTH"
grep -qF 'Gamification review sync failed' "$REVIEW"
grep -qF -- "->where('unlocked', false)" "$SERVICE"
grep -qF 'if ($claimed !== 1)' "$SERVICE"
grep -qF "'unlocked_now' => false" "$SERVICE"
test "$(grep -cF -- '->lockForUpdate()' "$SERVICE")" -ge 2
grep -qF 'test_unlocking_same_achievement_twice_awards_xp_only_once' "$TEST"
grep -qF 'test_repeated_same_day_activity_awards_daily_login_xp_only_once' "$TEST"
grep -qF 'Schema::getIndexes' "$XP_UNIQUE_MIGRATION"
grep -qF 'CREATE UNIQUE INDEX user_xp_user_id_unique_runtime ON user_xp (user_id)' "$XP_UNIQUE_MIGRATION"
grep -qF 'COUNT(*) > 1' "$XP_UNIQUE_MIGRATION"
grep -qF 'test_user_xp_state_is_unique_per_user' "$SCHEMA_TEST"
grep -qF 'test_user_position_is_lower_is_better_and_locked_progress_is_not_fake_complete' "$TEST"
grep -qF 'test_review_save_stays_successful_when_gamification_sync_fails' "$TEST"

echo 'gamification active progress contract gate OK'
