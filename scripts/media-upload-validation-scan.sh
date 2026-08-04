#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"
PROFILE_CONTROLLER="backend/app/Http/Controllers/Api/ProfileController.php"
BUSINESS_CONTROLLER="backend/app/Http/Controllers/Api/BusinessProfileController.php"
ROUTES="backend/routes/api.php"
PROVIDER="backend/app/Providers/AppServiceProvider.php"

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Media upload validation scan =="

test -f "$CONTROLLER"

grep -qF "'images' => 'nullable|array|max:10'" "$CONTROLLER"
grep -qF "'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096'" "$CONTROLLER"
grep -qF "'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200'" "$CONTROLLER"
grep -qF "scaleDown(width: 1200, height: 1200)" "$CONTROLLER"
grep -qF "Storage::disk('public')->put" "$CONTROLLER"
grep -qF "Str::uuid() . '.webp'" "$CONTROLLER"
grep -qF "No puedes tener más de 10 imágenes en total por anuncio." "$CONTROLLER"

# Profile, business, and identity uploads keep MIME/size constraints and named abuse budgets.
grep -qF 'mimes:jpg,jpeg,png,webp|max:5120|dimensions:max_width=4096,max_height=4096' "$PROFILE_CONTROLLER"
grep -qF "'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120'" "$PROFILE_CONTROLLER"
grep -qF "'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096']" "$BUSINESS_CONTROLLER"
grep -qF "'banner' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=4096,max_height=4096']" "$BUSINESS_CONTROLLER"
grep -qF "'csf' => ['required', 'file', 'mimes:pdf', 'max:5120']" "$BUSINESS_CONTROLLER"
grep -qF 'RateLimiter::for("profile-uploads"' "$PROVIDER"
grep -qF 'RateLimiter::for("identity-uploads"' "$PROVIDER"
grep -qF "Route::middleware('throttle:profile-uploads')->post('/user/avatar'" "$ROUTES"
grep -qF "Route::middleware('throttle:profile-uploads')->post('/user/business-profile/logo'" "$ROUTES"
grep -qF "Route::middleware('throttle:profile-uploads')->post('/user/business-profile/banner'" "$ROUTES"
grep -qF "Route::middleware('throttle:identity-uploads')->post('/user/business-profile/csf'" "$ROUTES"
grep -qF "Route::middleware('throttle:identity-uploads')->post('/user/kyc'" "$ROUTES"

echo "media upload validation scan OK"
