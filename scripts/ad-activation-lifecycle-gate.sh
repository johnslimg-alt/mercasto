#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AD_CONTROLLER="$ROOT/backend/app/Http/Controllers/Api/AdController.php"
ADMIN_CONTROLLER="$ROOT/backend/app/Http/Controllers/Api/AdminAdModerationController.php"
APP="$ROOT/src/App.jsx"
ADMIN_CENTER="$ROOT/src/components/admin/AdminModerationCenter.jsx"

printf '%s\n' '== Ad activation lifecycle gate =='

grep -qF "'status' => 'required|in:paused,inactive,archived'" "$AD_CONTROLLER"
grep -qF "El periodo del anuncio terminó" "$AD_CONTROLLER"
grep -qF "where('status', 'paused')" "$AD_CONTROLLER"
grep -qF "where('expires_at', '>', now())" "$AD_CONTROLLER"

if grep -A12 "elseif (\$action === 'activate')" "$AD_CONTROLLER" | grep -q "inactive"; then
  echo 'bulk activation must not reactivate inactive ads' >&2
  exit 1
fi

grep -qF "'expires_at' => \$publishImmediately ? Ad::freshExpiry() : null" "$ADMIN_CONTROLLER"
grep -qF "seller_confirmation_required" "$ADMIN_CONTROLLER"
grep -qF "notifyApprovalPendingReactivation" "$ADMIN_CONTROLLER"

grep -qF '/admin/moderation/ads/${id}/decision' "$APP"
if grep -qF '/ads/${id}/status' "$APP"; then
  echo 'legacy admin moderation still uses generic status endpoint' >&2
  exit 1
fi

grep -qF "approveSellerConfirmation" "$ADMIN_CENTER"

echo 'ad activation lifecycle gate OK'
