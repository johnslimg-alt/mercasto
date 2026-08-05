#!/usr/bin/env bash
set -euo pipefail

CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"
JOB="backend/app/Jobs/ModerateAdWithAI.php"
EMBED_JOB="backend/app/Jobs/GenerateAdEmbedding.php"
OBSERVER="backend/app/Observers/AdObserver.php"
COMMAND="backend/app/Console/Commands/RequeueLegacyModeration.php"
CONFIG="backend/config/services.php"
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
grep -qF "'x-goog-api-key' => \$apiKey" "$JOB"
grep -qF "gemini-3.6-flash" "$JOB"
grep -qF "gemini-3.6-flash" "$CONFIG"
grep -qF 'seller_confirmation_required' "$JOB"
grep -qF '$alreadyRecorded' "$JOB"
grep -qF 'class GenerateAdEmbedding' "$EMBED_JOB"
grep -qF 'ModerateAdWithAI::dispatch($ad->id, false)->afterCommit();' "$COMMAND"
grep -qF '{--execute : Requeue the selected ads}' "$COMMAND"
grep -qF "'confirm_available' => 'required|accepted'" "$CONTROLLER"
grep -qF "\$ad->ai_moderation_status === 'approved'" "$CONTROLLER"
grep -qF "(\$ad->ai_moderation_status ?? null) === 'approved'" "$MIDDLEWARE"
grep -qF "confirm-reactivation-ad-" "$UI"
grep -qF "review_ready" "$UI"

echo "moderation pipeline gate OK"
