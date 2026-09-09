#!/usr/bin/env bash
set -euo pipefail

SERVICE='backend/app/Services/GamificationService.php'
AUTH='backend/app/Http/Controllers/Api/AuthController.php'
REVIEW='backend/app/Http/Controllers/Api/ReviewController.php'
TEST='backend/tests/Feature/GamificationReviewMilestoneTest.php'

for file in "$SERVICE" "$AUTH" "$REVIEW" "$TEST"; do
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
grep -qF 'test_user_position_is_lower_is_better_and_locked_progress_is_not_fake_complete' "$TEST"
grep -qF 'test_review_save_stays_successful_when_gamification_sync_fails' "$TEST"

echo 'gamification active progress contract gate OK'
