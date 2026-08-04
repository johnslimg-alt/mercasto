#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BASE_URL="${BASE_URL:-https://mercasto.com}"
SMS_LAUNCH_MODE="${SMS_LAUNCH_MODE:-disabled}"

case "$SMS_LAUNCH_MODE" in
  enabled|disabled) ;;
  *) echo "SMS_LAUNCH_MODE must be enabled or disabled" >&2; exit 1 ;;
esac

providers_json="$(curl -fsS --connect-timeout 10 --max-time 30 "$BASE_URL/api/auth/providers")"
sms_enabled="$(PROVIDERS_JSON="$providers_json" node --input-type=module - <<'NODE'
const payload = JSON.parse(process.env.PROVIDERS_JSON || '{}');
const providers = payload.providers ?? payload;
const raw = providers?.sms;
const enabled = typeof raw === 'object' ? raw?.enabled === true : raw === true;
process.stdout.write(enabled ? 'true' : 'false');
NODE
)"

echo "sms_launch_mode=$SMS_LAUNCH_MODE"
echo "public_sms_provider_enabled=$sms_enabled"

if [[ "$SMS_LAUNCH_MODE" == "enabled" ]]; then
  if [[ "$sms_enabled" != "true" ]]; then
    echo "SMS launch mode is enabled but the public provider endpoint reports disabled." >&2
    exit 1
  fi
  REQUIRE_SMS_READY=1 bash scripts/sms-readiness-smoke.sh
else
  if [[ "$sms_enabled" != "false" ]]; then
    echo "SMS launch mode is disabled but production reports an enabled provider." >&2
    exit 1
  fi

  grep -qF '<ProfileEditScreen smsEnabled={availableProviders.sms} />' src/App.jsx
  grep -qF 'smsEnabled={availableProviders.sms}' src/App.jsx
  grep -qF 'export default function ProfileEditScreen({ smsEnabled = false })' src/components/screens/ProfileEditScreen.jsx
  grep -qF '{smsEnabled && (' src/components/screens/ProfileEditScreen.jsx
  grep -qF '...(smsEnabled ? [' src/components/OnboardingModal.jsx
  grep -qF 'La verificación por SMS se encuentra temporalmente deshabilitada.' src/components/screens/AyudaScreen.jsx
  grep -qF 'La autenticación por SMS no está disponible en este momento.' backend/app/Http/Controllers/Api/AuthController.php
  grep -qF 'La verificación por SMS no está disponible en este momento.' backend/app/Http/Controllers/Api/PhoneVerificationController.php
fi

echo "SMS launch mode smoke OK"
