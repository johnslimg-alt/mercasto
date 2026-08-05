#!/usr/bin/env bash
set -euo pipefail

COMMAND="backend/app/Console/Commands/SendSellerReactivationReminders.php"
MAIL="backend/app/Mail/SellerReactivationReminderMail.php"
VIEW="backend/resources/views/emails/seller_reactivation_reminder.blade.php"
SCHEDULE="backend/routes/console.php"
JOB="backend/app/Jobs/ModerateAdWithAI.php"
APP="src/App.jsx"
MY_ADS="src/components/screens/MyAdsScreen.jsx"

echo "== Seller reactivation reminder gate =="

grep -qF "class SendSellerReactivationReminders" "$COMMAND"
grep -qF "{--execute : Persist reminders and queue email delivery}" "$COMMAND"
grep -qF "seller_reactivation_reminder" "$COMMAND"
grep -qF "follow_up" "$COMMAND"
grep -qF "lockForUpdate" "$COMMAND"
grep -qF "Mail::to(\$user->email)->queue" "$COMMAND"

grep -qF "class SellerReactivationReminderMail" "$MAIL"
grep -qF "implements ShouldQueue" "$MAIL"
grep -qF "Confirmar y publicar" "$VIEW"
grep -qF "7 días" "$VIEW"
grep -qF '$49 MXN' "$VIEW"
grep -qF "ads:remind-reactivation --execute --follow-up-after=72 --limit=500" "$SCHEDULE"
grep -qF "seller_reactivation_ready" "$JOB"
grep -qF "/profile?tab=my_ads&filter=review_ready" "$JOB"
grep -qF "requestedTab" "$APP"
grep -qF "requestedFilter" "$MY_ADS"
grep -qF "review_ready" "$MY_ADS"

echo "seller reactivation reminder gate OK"
