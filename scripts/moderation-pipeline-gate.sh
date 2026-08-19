#!/usr/bin/env bash
set -euo pipefail

CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"
JOB="backend/app/Jobs/ModerateAdWithAI.php"
EMBED_JOB="backend/app/Jobs/GenerateAdEmbedding.php"
COVER_SERVICE="backend/app/Services/AdIllustrativeCoverService.php"
MARKETPLACE_CONFIG="backend/config/marketplace.php"
OBSERVER="backend/app/Observers/AdObserver.php"
COMMAND="backend/app/Console/Commands/RequeueLegacyModeration.php"
CONFIG="backend/config/services.php"
COMPOSE="docker-compose.yml"
MIDDLEWARE="backend/app/Http/Middleware/EnforcePaidAdRenewal.php"
UI="src/components/screens/MyAdsScreen.jsx"

if grep -qF 'dispatch(function () use ($ad)' "$CONTROLLER"; then
  echo "Legacy inline ad AI closure returned" >&2
  exit 1
fi

if grep -qF 'generateContent?key=' "$JOB"; then
  echo "Gemini key must not be sent in the URL" >&2
  exit 1
fi

grep -qF 'GenerateAdEmbedding::dispatch($ad->id)->afterCommit();' "$OBSERVER"
grep -qF 'use App\Services\LocalAiClient;' "$JOB"
grep -qF 'LocalAiClient $ai' "$JOB"
grep -qF "config('services.ollama.vision_model'" "$JOB"
grep -qF "'vision_model'" "$CONFIG"
grep -qF 'OLLAMA_VISION_MODEL=qwen3-vl:2b-instruct' "$COMPOSE"
grep -qF "'images' => \$aiImages" "$JOB"
grep -qF 'private function moderationImages(Ad $ad, array $imagePaths): array' "$JOB"
grep -qF 'private function moderationVideoFrames(Ad $ad): array' "$JOB"
grep -qF 'count($originalImages) - count($images)' "$JOB"
grep -qF "\$decision = 'manual_review';" "$JOB"
grep -qF "'reviewed_video_frame_count' => count(\$videoFrames)" "$JOB"
grep -qF 'seller_confirmation_required' "$JOB"
grep -qF '$alreadyRecorded' "$JOB"
grep -qF 'class GenerateAdEmbedding' "$EMBED_JOB"
grep -qF 'isLegacyPlaceholder' "$COVER_SERVICE"
grep -qF "config('marketplace.legacy_placeholder_sha256', [])" "$COVER_SERVICE"
grep -qF "Storage::disk('public')->delete(\$legacyPlaceholders);" "$COVER_SERVICE"
grep -qF '690f06ce1ba1fd1ecf04edbcd2ff836f45c57f183f4cf362b238e77b72e9e979' "$MARKETPLACE_CONFIG"
grep -qF 'ModerateAdWithAI::dispatch($ad->id, false)' "$COMMAND"
grep -qF '{--limit=5 : Maximum archived ads to inspect}' "$COMMAND"
grep -qF '{--spacing=30 : Seconds between queued moderation jobs}' "$COMMAND"
grep -qF '{--include-manual-review : Explicitly retry content decisions that require human review}' "$COMMAND"
grep -qF "'failed'," "$COMMAND"
grep -qF "'provider_error'," "$COMMAND"
grep -qF "'provider_quota'," "$COMMAND"
grep -qF "if (\$this->option('include-manual-review'))" "$COMMAND"
grep -qF -- '->delay(now()->addSeconds($index * $spacing))' "$COMMAND"
grep -qF 'public int $tries = 3;' "$JOB"
if grep -Eq 'generativelanguage\.googleapis\.com|api\.deepseek\.com|api\.anthropic\.com|x-goog-api-key|GEMINI_MODERATION' "$JOB" "$CONFIG"; then
  echo "External AI provider runtime returned to moderation pipeline" >&2
  exit 1
fi
grep -qF '{--execute : Requeue the selected ads}' "$COMMAND"
grep -qF "'confirm_available' => 'required|accepted'" "$CONTROLLER"
grep -qF "\$ad->ai_moderation_status === 'approved'" "$CONTROLLER"
grep -qF "(\$ad->ai_moderation_status ?? null) === 'approved'" "$MIDDLEWARE"
grep -qF "confirm-reactivation-ad-" "$UI"
grep -qF "review_ready" "$UI"

echo "moderation pipeline gate OK"
