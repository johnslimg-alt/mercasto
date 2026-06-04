#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROUTES="backend/routes/api.php"
AUTH="backend/app/Http/Controllers/Api/AuthController.php"
TWO_FACTOR="backend/app/Http/Controllers/Api/TwoFactorAuthenticationController.php"
DELETE_ACCOUNT="backend/app/Http/Controllers/Api/AccountDeletionController.php"
PROFILE="backend/app/Http/Controllers/Api/ProfileController.php"
APP="src/App.jsx"

echo "== Auth and account launch gate =="

test -f "$ROUTES"
test -f "$AUTH"
test -f "$TWO_FACTOR"
test -f "$DELETE_ACCOUNT"
test -f "$PROFILE"
test -f "$APP"

# Public auth routes must be rate-limited.
grep -qF "Route::middleware('throttle:auth')->group(function ()" "$ROUTES"
grep -qF "Route::post('/register', [AuthController::class, 'register'])" "$ROUTES"
grep -qF "Route::post('/login', [AuthController::class, 'login'])" "$ROUTES"
grep -qF "Route::post('/login/two-factor', [AuthController::class, 'loginTwoFactor'])" "$ROUTES"
grep -qF "Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])" "$ROUTES"
grep -qF "Route::post('/reset-password', [AuthController::class, 'resetPassword'])" "$ROUTES"
grep -qF "Route::middleware('throttle:api')->get('/auth/providers', [AuthController::class, 'getProviders'])" "$ROUTES"
grep -qF "Route::get('/auth/{provider}/redirect', [AuthController::class, 'redirectToProvider'])" "$ROUTES"
grep -qF "Route::get('/auth/{provider}/callback', [AuthController::class, 'handleProviderCallback'])" "$ROUTES"

# Protected account routes.
grep -qF "Route::middleware('auth:sanctum')->group(function ()" "$ROUTES"
grep -qF "Route::post('/logout', [AuthController::class, 'logout'])" "$ROUTES"
grep -qF "Route::get('/user', [ProfileController::class, 'show'])" "$ROUTES"
grep -qF "Route::put('/user/password', [ProfileController::class, 'changePassword'])" "$ROUTES"
grep -qF "Route::delete('/user', [AccountDeletionController::class, 'delete'])" "$ROUTES"
grep -qF "Route::post('/user/two-factor-authentication', [TwoFactorAuthenticationController::class, 'store'])" "$ROUTES"
grep -qF "Route::post('/user/two-factor-authentication/confirm', [TwoFactorAuthenticationController::class, 'confirm'])" "$ROUTES"
grep -qF "Route::delete('/user/two-factor-authentication', [TwoFactorAuthenticationController::class, 'destroy'])" "$ROUTES"

# Registration and login security.
grep -qF "'password' => 'required|string|min:8'" "$AUTH"
grep -qF "'phone_number' => 'nullable|string|max:20|unique:users'" "$AUTH"
grep -qF "hash('sha256'" "$AUTH"
grep -qF "role = 'individual'" "$AUTH"
grep -qF "Has alcanzado el límite de cuentas creadas desde esta red" "$AUTH"
grep -qF "Hash::make" "$AUTH"
grep -qF "createToken('auth_token')->plainTextToken" "$AUTH"
grep -qF "makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])" "$AUTH"

# 2FA login and OAuth bypass protection.
grep -qF "public function loginTwoFactor" "$AUTH"
grep -qF "verifyKey" "$AUTH"
grep -qF "hash_equals" "$AUTH"
grep -qF "unset(" "$AUTH"
grep -qF "oauth_2fa" "$AUTH"
grep -qF "Cache::put('oauth_exchange:'" "$AUTH"
grep -qF "Cache::pull('oauth_exchange:'" "$AUTH"
grep -qF "allowedProviders = ['google', 'apple', 'telegram', 'twitter']" "$AUTH"
grep -qF "Proveedor no soportado" "$AUTH"

# Password reset must avoid enumeration, expire, revoke tokens, and delete reset rows.
grep -qF "Always return the same response regardless of whether email exists" "$AUTH"
grep -qF "password_reset_tokens" "$AUTH"
grep -qF "addHour()->isPast()" "$AUTH"
grep -qF "tokens()->delete()" "$AUTH"
grep -qF "Contraseña restablecida exitosamente" "$AUTH"

# Provider availability must use config, not raw env, and expose Google availability safely.
grep -qF "public function getProviders" "$AUTH"
grep -qF "config('services.google.client_id')" "$AUTH"
grep -qF "config('services.google.client_secret')" "$AUTH"
grep -qF "config('services.twilio.sid')" "$AUTH"
grep -qF "'sms'" "$AUTH"

# Logout must revoke the current token only.
grep -qF "currentAccessToken()->delete()" "$AUTH"
grep -qF "Sesión cerrada exitosamente" "$AUTH"

# 2FA management must prevent overwrite and revoke other sessions after setup.
grep -qF "two_factor_secret &&" "$TWO_FACTOR"
grep -qF "generateSecretKey()" "$TWO_FACTOR"
grep -qF "two_factor_recovery_codes" "$TWO_FACTOR"
grep -qF "tokens()->where('id', '!='," "$TWO_FACTOR"
grep -qF "two_factor_confirmed_at" "$TWO_FACTOR"
grep -qF "Invalid 2FA code" "$TWO_FACTOR"

# Self-delete must protect final admin, clean user-owned data, preserve financial audit records, revoke tokens.
grep -qF "único administrador" "$DELETE_ACCOUNT"
grep -qF "payments')->where('user_id'" "$DELETE_ACCOUNT"
grep -qF "payments')->whereIn('ad_id'" "$DELETE_ACCOUNT"
grep -qF "Ad::where('user_id'" "$DELETE_ACCOUNT"
grep -qF "Cache::forget('sitemap_xml')" "$DELETE_ACCOUNT"
grep -qF "Cache::forget('google_merchant_xml')" "$DELETE_ACCOUNT"
grep -qF "tokens()->delete()" "$DELETE_ACCOUNT"
grep -qF "user->delete()" "$DELETE_ACCOUNT"

# Frontend auth/account flow markers.
grep -qF "availableProviders" "$APP"
grep -qF "/auth/providers" "$APP"
grep -qF "requiresTwoFactor" "$APP"
grep -qF "login/two-factor" "$APP"
grep -qF "forgot-password" "$APP"
grep -qF "reset-password" "$APP"
grep -qF "handleLogout" "$APP"
grep -qF "delete account" "$APP" || grep -qF "eliminar tu cuenta" "$APP" || grep -qF "eliminar cuenta" "$APP"

echo "auth and account launch gate OK"
