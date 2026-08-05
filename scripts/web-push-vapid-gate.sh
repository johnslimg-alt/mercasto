#!/usr/bin/env bash
set -euo pipefail

APP="src/App.jsx"
MANAGER="src/components/ui/PushNotificationManager.jsx"
UTILITY="src/utils/webPush.js"
CONTROLLER="backend/app/Http/Controllers/Api/PushController.php"
COMMAND="backend/app/Console/Commands/SendPushNotification.php"
CONFIG="backend/config/services.php"

echo "== Web Push VAPID contract gate =="

if grep -R -qF 'BAhZDxk3BjI_OCkHCOEyihsxsuCfcDtMilUZjMfecw-Lt4JvHNfYkmZIU_llDiaF3L0uOtXsgU60IZksmtpTrIs' src; then
  echo "Legacy hardcoded VAPID public key returned" >&2
  exit 1
fi

if grep -R -qF 'VITE_VAPID_PUBLIC_KEY' src; then
  echo "Frontend must load the VAPID public key from the backend contract" >&2
  exit 1
fi

grep -qF "fetchVapidPublicKey(API_URL)" "$APP"
grep -qF "ensurePushSubscription(registration, vapidKey)" "$APP"
grep -qF "normalizedPreferences.push_notifications !== false" "$APP"
grep -qF "fetchVapidPublicKey(API_BASE)" "$MANAGER"
grep -qF "applicationServerKeyMatches" "$UTILITY"
grep -qF "await subscription.unsubscribe();" "$UTILITY"
grep -qF "cache: 'no-store'" "$UTILITY"

grep -qF "Las notificaciones push no están disponibles temporalmente." "$CONTROLLER"
grep -qF "header('Cache-Control', 'no-store')" "$CONTROLLER"
grep -qF "config('services.webpush.vapid_public_key')" "$COMMAND"
grep -qF "config('services.webpush.vapid_private_key')" "$COMMAND"
if grep -qF "env('VAPID_" "$COMMAND"; then
  echo "Push command bypasses cached Laravel configuration" >&2
  exit 1
fi
grep -qF "'vapid_public_key' => env('VAPID_PUBLIC_KEY')" "$CONFIG"
grep -qF 'VAPID_PUBLIC_KEY=' .env.example
grep -qF 'VAPID_PRIVATE_KEY=' .env.example
grep -qF 'VAPID_PUBLIC_KEY=' backend/.env.example
grep -qF 'VAPID_PRIVATE_KEY=' backend/.env.example
node --test tests/web-push-vapid.test.mjs

echo "web push VAPID contract gate OK"
