#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADMIN="$ROOT/backend/app/Http/Controllers/Api/AdminAdModerationController.php"
ADS="$ROOT/backend/app/Http/Controllers/Api/AdController.php"
GUIDANCE="$ROOT/backend/app/Services/AdModerationGuidanceService.php"
UI="$ROOT/src/components/admin/AdminModerationCenter.jsx"

printf '%s\n' '== Admin request changes gate =='

grep -qF 'changes_requested' "$ADMIN"
grep -qF "'admin_changes_requested'" "$ADMIN"
grep -qF 'seller_changes_requested' "$ADMIN"
grep -qF 'SellerCorrectionRequiredMail' "$ADMIN"
grep -qF 'Pausa el anuncio activo antes de solicitar cambios.' "$ADMIN"

grep -qF "'admin_changes_requested'" "$GUIDANCE"
grep -qF "'admin_request'" "$GUIDANCE"
grep -qF "'admin_changes_requested'" "$ADS"
grep -qF "submitDecision('changes_requested')" "$UI"
grep -qF 'requestChanges' "$UI"

if grep -A45 'private function notifyChangesRequested' "$ADMIN" | grep -q "'status' => 'active'"; then
  echo 'request changes flow must never activate an ad' >&2
  exit 1
fi

echo 'admin request changes gate OK'
