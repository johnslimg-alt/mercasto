#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROUTES="backend/routes/api.php"
PROVIDER="backend/app/Providers/AppServiceProvider.php"
AUTH_CONTROLLER="backend/app/Http/Controllers/Api/AuthController.php"

echo "== OTP abuse control launch gate =="

test -f "$ROUTES"
test -f "$PROVIDER"
test -f "$AUTH_CONTROLLER"

# OTP must have a named limiter separate from general auth traffic.
grep -qF 'RateLimiter::for("otp"' "$PROVIDER"
grep -qF 'Limit::perHour(5)' "$PROVIDER"

# Public phone auth endpoints must exist and be discoverable for SMS launch readiness.
grep -qF "Route::post('/auth/phone/request'" "$ROUTES"
grep -qF "Route::post('/auth/phone/verify'" "$ROUTES"
grep -qF "requestPhoneCode" "$ROUTES"
grep -qF "verifyPhoneCode" "$ROUTES"

# At minimum, phone auth endpoints must not be outside throttled route groups.
grep -qF "Route::middleware('throttle:auth')->group" "$ROUTES"
grep -qF "Route::post('/auth/phone/request', [AuthController::class, 'requestPhoneCode']);" "$ROUTES"
grep -qF "Route::post('/auth/phone/verify', [AuthController::class, 'verifyPhoneCode']);" "$ROUTES"

# Controller must keep provider readiness checks and avoid silently sending OTP when SMS config is absent.
grep -qF "requestPhoneCode" "$AUTH_CONTROLLER"
grep -qF "verifyPhoneCode" "$AUTH_CONTROLLER"
grep -qF "services.twilio" "$AUTH_CONTROLLER"
grep -qF "Phone verification service is not configured" "$AUTH_CONTROLLER"

# Guardrail: no unthrottled duplicate phone-auth routes outside api.php.
if grep -sRIn --exclude='api.php' --exclude-dir='vendor' --exclude-dir='storage' --exclude-dir='node_modules' "/auth/phone/" backend routes scripts; then
  echo "Phone auth routes must remain centralized and throttled in backend/routes/api.php." >&2
  exit 1
fi

echo "OTP abuse control launch gate OK"
