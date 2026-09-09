#!/usr/bin/env bash
set -euo pipefail

CONTROLLER='backend/app/Http/Controllers/Api/GamificationController.php'
ROUTES='backend/routes/api.php'
PROVIDER='backend/app/Providers/AppServiceProvider.php'
TEST='backend/tests/Feature/GamificationActivityEndpointHardeningTest.php'

for file in "$CONTROLLER" "$ROUTES" "$PROVIDER" "$TEST"; do
  test -f "$file"
done

grep -qF "'type' => ['nullable', 'string', 'in:login']" "$CONTROLLER"
grep -qF "recordActivity(\$user, 'login')" "$CONTROLLER"
! grep -qF "input('type'" "$CONTROLLER"
grep -qF "Route::middleware('throttle:gamification-activity')->post('/gamification/activity'" "$ROUTES"
grep -qF 'RateLimiter::for("gamification-activity"' "$PROVIDER"
grep -qF 'Limit::perMinute(10)->by($key)' "$PROVIDER"
grep -qF 'test_client_cannot_submit_server_side_activity_types' "$TEST"
grep -qF 'test_activity_endpoint_enforces_rate_limit' "$TEST"
grep -qF 'test_activity_rate_limit_does_not_consume_payment_bucket' "$TEST"
grep -qF 'assertStatus(429)' "$TEST"

echo 'gamification activity endpoint gate OK'
