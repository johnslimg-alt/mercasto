#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCREEN="$ROOT/src/components/screens/ReferralScreen.jsx"
CONTROLLER="$ROOT/backend/app/Http/Controllers/Api/ReferralController.php"
TRANSLATIONS="$ROOT/src/constants/translations"

echo "== Referral localization contract gate =="

for code in already_applied invalid_code self_referral applied; do
  grep -qF "'code' => '${code}'" "$CONTROLLER"
done

grep -qF 'messagesByCode' "$SCREEN"
grep -qF 'referral_share_message' "$SCREEN"
grep -qF 'referral_status_completed' "$SCREEN"
grep -qF 'referral_status_pending' "$SCREEN"
grep -qF "applyStatus.type === 'success'" "$SCREEN"

if grep -qF 'setApplyStatus(json.message' "$SCREEN"; then
  echo "Referral UI must not render backend-localized message directly" >&2
  exit 1
fi
if grep -qF "includes('')" "$SCREEN"; then
  echo "Referral success state must not depend on Spanish punctuation" >&2
  exit 1
fi

for key in \
  referral_share_message \
  referral_apply_already_applied \
  referral_apply_invalid \
  referral_apply_self \
  referral_apply_success \
  referral_apply_error \
  referral_status_completed \
  referral_status_pending; do
  for lang in es en pt fr zh ko de it ar ru ja; do
    grep -qF "${key}:" "$TRANSLATIONS/${lang}.js"
  done
done

echo "referral localization contract gate OK"
