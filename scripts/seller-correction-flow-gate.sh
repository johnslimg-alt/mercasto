#!/usr/bin/env bash
set -euo pipefail

SERVICE="backend/app/Services/AdModerationGuidanceService.php"
COMMAND="backend/app/Console/Commands/SendSellerCorrectionNotices.php"
CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"
MODEL="backend/app/Models/Ad.php"
MAIL="backend/app/Mail/SellerCorrectionRequiredMail.php"
VIEW="backend/resources/views/emails/seller_correction_required.blade.php"
SCHEDULE="backend/routes/console.php"
MY_ADS="src/components/screens/MyAdsScreen.jsx"

echo "== Seller correction flow gate =="

grep -qF 'class AdModerationGuidanceService' "$SERVICE"
grep -qF 'private const ADMIN_ONLY_TERMS' "$SERVICE"
grep -qF "'desbloqueo'" "$SERVICE"
grep -qF "'iptv'" "$SERVICE"
grep -qF "'photos'" "$SERVICE"
grep -qF "'details'" "$SERVICE"
grep -qF "'price'" "$SERVICE"
grep -qF "'payment'" "$SERVICE"
grep -qF "'advance_payment'" "$SERVICE"
if grep -qF "'fraud'," "$SERVICE"; then
  echo "Fraud suspicion alone must not suppress concrete seller guidance" >&2
  exit 1
fi

grep -qF 'public function latestModerationDecision(): HasOne' "$MODEL"
grep -qF -- "->where('source', 'ai')" "$MODEL"
grep -qF -- "->where('decision', 'manual_review')" "$MODEL"

grep -qF '$requiresSellerCorrection = $ad->status === '\''archived'\''' "$CONTROLLER"
grep -qF "&& \$ad->ai_moderation_status === 'manual_review'" "$CONTROLLER"
grep -qF "'status' => \$needsReModeration ? 'pending' : \$ad->status" "$CONTROLLER"
grep -qF "'ai_moderation_status' => \$needsReModeration ? 'queued'" "$CONTROLLER"
grep -qF "'moderation_submitted_at' => \$needsReModeration ? now()" "$CONTROLLER"
grep -qF "setAttribute('seller_correction'" "$CONTROLLER"

grep -qF 'class SendSellerCorrectionNotices' "$COMMAND"
grep -qF '{--execute : Persist notices and queue email delivery}' "$COMMAND"
grep -qF 'seller_correction_required' "$COMMAND"
grep -qF 'previouslyNotifiedAdIds' "$COMMAND"
grep -qF 'lockForUpdate' "$COMMAND"
if grep -qF "'status' => 'active'" "$COMMAND"; then
  echo "Seller correction command must never activate ads" >&2
  exit 1
fi

grep -qF 'class SellerCorrectionRequiredMail' "$MAIL"
grep -qF 'implements ShouldQueue' "$MAIL"
grep -qF 'Corregir y volver a enviar' "$VIEW"
grep -qF 'ads:notify-seller-corrections --execute --limit=500' "$SCHEDULE"

grep -qF "'needs_correction'" "$MY_ADS"
grep -qF 'requiresSellerCorrection' "$MY_ADS"
grep -qF 'Requiere corrección' "$MY_ADS"
grep -qF 'Corregir y reenviar' "$MY_ADS"

echo "seller correction flow gate OK"
