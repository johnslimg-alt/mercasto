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
MODEL="backend/app/Models/Ad.php"
ADMIN_CONTROLLER="backend/app/Http/Controllers/Api/AdminAdModerationController.php"
RECONCILE="backend/app/Console/Commands/ReconcileModerationVisibility.php"
DUPLICATE_SERVICE="backend/app/Services/ListingDuplicateDetector.php"
RESOLVE_DUPLICATES="backend/app/Console/Commands/ResolveDuplicateSubmissions.php"
UI="src/components/screens/MyAdsScreen.jsx"

# The guards below can only see their subject if these paths resolve; a missing
# path makes grep exit non-zero and the guard pass while observing nothing.
for file in "$CONTROLLER" "$JOB"; do
  test -f "$file" || { echo "FAIL: missing observed file $file" >&2; exit 1; }
done

if grep -qF 'dispatch(function () use ($ad)' "$CONTROLLER"; then
  echo "Legacy inline ad AI closure returned" >&2
  exit 1
fi

if grep -qF 'generateContent?key=' "$JOB"; then
  echo "Gemini key must not be sent in the URL" >&2
  exit 1
fi

grep -qF 'GenerateAdEmbedding::dispatch($ad->id)->afterCommit();' "$OBSERVER"
grep -qF 'use App\Services\AiModerationGatewayClient;' "$JOB"
grep -qF 'AiModerationGatewayClient $aiGateway' "$JOB"
grep -qF "'ai_moderation_gateway'" "$CONFIG"
grep -qF "'url' => env('AI_MODERATION_GATEWAY_URL', 'http://mercasto-ai-gateway:8080')" "$CONFIG"
grep -qF "'token' => env('MERCASTO_AI_INTERNAL_TOKEN')" "$CONFIG"
grep -qF "'timeout' => (int) env('AI_MODERATION_GATEWAY_TIMEOUT', 150)" "$CONFIG"
grep -qF 'AI_MODERATION_GATEWAY_URL=http://mercasto-ai-gateway:8080' "$COMPOSE"
grep -qF 'MERCASTO_AI_INTERNAL_TOKEN=${MERCASTO_AI_INTERNAL_TOKEN:-}' "$COMPOSE"
grep -qF 'AI_MODERATION_GATEWAY_TIMEOUT=${AI_MODERATION_GATEWAY_TIMEOUT:-150}' "$COMPOSE"
grep -qF 'OLLAMA_VISION_MODEL=qwen3-vl:2b-instruct' "$COMPOSE"
grep -qF 'structuredContext: [' "$JOB"
grep -qF "'category' => \$ad->category" "$JOB"
grep -qF "'attributes' => \$ad->attributes ?? []" "$JOB"
grep -qF 'imagesBase64: $aiImages' "$JOB"
grep -qF 'sourceImageCount: $sourceMediaCount' "$JOB"
grep -qF 'policySignals: $canonicalPolicySignals' "$JOB"
if grep -Eq 'LocalAiClient|services\.ollama\.vision_model|chatPro\(' "$JOB"; then
  echo "Direct local-model client returned to listing moderation job" >&2
  exit 1
fi
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
grep -qF 'ModerateAdWithAI::dispatch($ad->id, false, $cycle->id)' "$COMMAND"
grep -qF "'activate_on_human_approval' => false" "$COMMAND"
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
grep -qF 'isSellerConfirmationReactivationEligible()' "$CONTROLLER"
# Moderation lifecycle invariant: ai_moderation_status = 'approved' means the ad
# IS publicly visible; a granted approval that must not publish yet is stored as
# 'reactivation_pending'. The (status, ai_moderation_status) pair for approvals is
# single-sourced in Ad::approvalOutcome() so it cannot drift back to
# "approved + archived", which is what stranded approved ads invisible forever.
grep -qF "public const MODERATION_APPROVED = 'approved';" "$MODEL"
grep -qF "public const MODERATION_REACTIVATION_PENDING = 'reactivation_pending';" "$MODEL"
grep -qF 'public static function approvalOutcome(bool $publishNow): array' "$MODEL"
grep -qF 'public function scopeApprovedButHidden(Builder $query): Builder' "$MODEL"
grep -qF "'seller_confirmation_required'" "$MODEL"
# Assert the mapper's behaviour inside its own body rather than exact formatting, so
# it stays checkable as the array is laid out or extended.
APPROVAL_MAPPER=$(grep -A 14 'public static function approvalOutcome' "$MODEL")
grep -qF "'ai_moderation_status' => self::MODERATION_APPROVED," <<<"$APPROVAL_MAPPER"
grep -qF "'ai_moderation_status' => self::MODERATION_REACTIVATION_PENDING," <<<"$APPROVAL_MAPPER"
# Publishing must carry a real lifetime: the shared ListingIndexability contract used
# by the sitemap and the SEO shell requires a future expires_at, so an approval that
# only flips `status` would be active yet still invisible to search engines.
grep -qF "'expires_at' => self::freshExpiry()," <<<"$APPROVAL_MAPPER"
grep -qF "'expires_at' => null," <<<"$APPROVAL_MAPPER"
grep -qF '[self::MODERATION_REACTIVATION_PENDING, self::MODERATION_APPROVED],' "$MODEL"
# Both approval writers must resolve the outcome through the model mapper.
grep -qF 'Ad::approvalOutcome(' "$JOB"
grep -qF 'Ad::approvalOutcome(' "$ADMIN_CONTROLLER"
if grep -qF -- "'ai_moderation_status' => 'approved'" "$JOB" "$ADMIN_CONTROLLER"; then
  echo "Approval status must be resolved by Ad::approvalOutcome()" >&2
  exit 1
fi
# Reconciliation command must exist and target the visible-approval status.
if [[ ! -f "$RECONCILE" ]]; then
  echo "Moderation visibility reconciliation command is missing" >&2
  exit 1
fi
grep -qF -- "->where('ai_moderation_status', Ad::MODERATION_APPROVED)" "$RECONCILE"
# Duplicate detection must be invoked by the pipeline itself, not merely exist in a
# test: the detector is a resolved dependency of the job, it runs on every
# submission before any provider call, and its evidence is recorded on the
# moderation decision. It must SURFACE a suspicion for a human and never judge.
if [[ ! -f "$DUPLICATE_SERVICE" ]]; then
  echo "Listing duplicate detector is missing" >&2
  exit 1
fi
grep -qF 'ListingDuplicateDetector $duplicates,' "$JOB"
grep -qF '$this->duplicateSignal = $duplicates->detect($ad);' "$JOB"
grep -qF "'duplicate' => \$this->duplicateSignal," "$JOB"
if grep -qE "'rejected'|\"rejected\"" "$DUPLICATE_SERVICE"; then
  echo "Duplicate detector must surface, not judge: no rejection decision allowed" >&2
  exit 1
fi
# The operator-facing resolution command must reuse that same detector instead of
# defining a second one, must keep the policy a flag rather than a hardcoded opinion,
# and must never touch an already-public ad.
if [[ ! -f "$RESOLVE_DUPLICATES" ]]; then
  echo "Duplicate resolution command is missing" >&2
  exit 1
fi
grep -qF 'ListingDuplicateDetector $detector' "$RESOLVE_DUPLICATES"
grep -qF '$detector->fingerprint(' "$RESOLVE_DUPLICATES"
grep -qF '$detector->reasonForId(' "$RESOLVE_DUPLICATES"
grep -qF '{--action=manual_review :' "$RESOLVE_DUPLICATES"
grep -qF '{--keep=earliest :' "$RESOLVE_DUPLICATES"
grep -qF '{--apply :' "$RESOLVE_DUPLICATES"
grep -qF -- "->where('status', '!=', 'active')" "$RESOLVE_DUPLICATES"
# The keeper is re-read and fingerprint-checked under a lock inside the same
# transaction, so a row can never be resolved against an original that was deleted or
# edited after the work list was built.
grep -qF "Ad::query()->lockForUpdate()->find(\$item['keeper'])" "$RESOLVE_DUPLICATES"
# A duplicate routed to manual review must also be archived: the admin queue only lists
# pending or archived unfinished ads, and AdRenewalService::fulfill() refuses to
# reactivate statuses outside active/expired/paused/inactive, so an archived row cannot
# be paid back into publication while it is still under review.
grep -qF "'status' => 'archived'," "$RESOLVE_DUPLICATES"
# The command's decision becomes the newest one, so it must carry the SAME structured
# duplicate signal the detector writes, or the admin payload would immediately clear
# suspected_duplicate for the very rows the command just routed to review.
grep -qF "'duplicate' => \$detector->evidenceFor(" "$RESOLVE_DUPLICATES"
grep -qF 'public const MATCHED_ON' "$DUPLICATE_SERVICE"
# A truncated candidate window proves nothing, so a negative result must fail closed
# instead of being treated as unique.
grep -qF '$duplicates->isInconclusive($this->duplicateSignal) => $duplicates->truncatedReason(),' "$JOB"
if grep -qE "hash\(|mb_strtolower|number_format\(" "$RESOLVE_DUPLICATES"; then
  echo "Duplicate resolution must reuse ListingDuplicateDetector, not re-implement its key" >&2
  exit 1
fi
grep -qF "data_get(\$decision->metadata, 'activation_mode') !== 'seller_confirmation_required'" "$MODEL"
grep -qF "(\$ad->ai_moderation_status ?? null) === 'approved'" "$MIDDLEWARE"
grep -qF "confirm-reactivation-ad-" "$UI"
grep -qF "review_ready" "$UI"

echo "moderation pipeline gate OK"
