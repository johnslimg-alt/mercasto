#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"
PROFILE_CONTROLLER="backend/app/Http/Controllers/Api/ProfileController.php"
BUSINESS_CONTROLLER="backend/app/Http/Controllers/Api/BusinessProfileController.php"
ROUTES="backend/routes/api.php"
PROVIDER="backend/app/Providers/AppServiceProvider.php"
BOOTSTRAP="backend/bootstrap/app.php"
IMAGE_MODERATION_MIDDLEWARE="backend/app/Http/Middleware/ModeratePublicImageUploads.php"
IMAGE_MODERATION_SERVICE="backend/app/Services/PublicImageModerationService.php"
AD_MODERATION_JOB="backend/app/Jobs/ModerateAdWithAI.php"

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

# Public images are blocked before storage unless the local vision model approves them.
test -f "$IMAGE_MODERATION_MIDDLEWARE"
test -f "$IMAGE_MODERATION_SERVICE"
grep -qF 'ModeratePublicImageUploads::class' "$BOOTSTRAP"
grep -qF "'api/user/avatar' => [" "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF "'api/user/profile' => [" "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF "'api/user/business-profile/logo' => [" "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF "'api/user/business-profile/banner' => [" "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF "'api/admin/banners/upload' => [" "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF 'Validator::make' "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF "\$user->role !== 'admin'" "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF 'RateLimiter::tooManyAttempts' "$IMAGE_MODERATION_MIDDLEWARE"
grep -qF 'chatPro([' "$IMAGE_MODERATION_SERVICE"
grep -qF "decision'] === 'approved'" "$IMAGE_MODERATION_SERVICE"
grep -qF "confidence'] >= 0.90" "$IMAGE_MODERATION_SERVICE"
grep -qF 'ImageManager::usingDriver(Driver::class)' "$IMAGE_MODERATION_SERVICE"

# Specialized moderation stays active for documents and listing media.
grep -qF 'PreScreenKycDocumentWithAI::dispatch' "$PROFILE_CONTROLLER"
grep -qF 'crossCheckCsfWithAi' "$BUSINESS_CONTROLLER"
grep -qF 'imagesBase64: $aiImages' "$AD_MODERATION_JOB"
grep -qF 'sourceImageCount: $sourceMediaCount' "$AD_MODERATION_JOB"
grep -qF 'policySignals: $canonicalPolicySignals' "$AD_MODERATION_JOB"
grep -qF 'array_merge($images, $videoFrames)' "$AD_MODERATION_JOB"
grep -qF 'moderationVideoFrames' "$AD_MODERATION_JOB"

if grep -qF "'images' => \$aiImages" "$AD_MODERATION_JOB"; then
  echo "legacy direct listing moderation media payload detected" >&2
  exit 1
fi

echo "media upload validation scan OK"
