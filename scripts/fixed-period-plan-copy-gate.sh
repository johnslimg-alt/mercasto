#!/usr/bin/env bash
set -euo pipefail

COPY="src/components/screens/legal/ReembolsosScreen.jsx"
PAYMENT="backend/app/Http/Controllers/Api/PaymentController.php"
LEGAL="docs/legal/MEXICO_LEGAL_SOURCE_REVIEW_2026-08-28.md"

echo "== Fixed-period plan copy gate =="
grep -qF 'no se renuevan automáticamente' "$COPY"
grep -qF 'se requiere una nueva compra para activar otro periodo' "$COPY"
grep -qF "'plan_expires_at' => now()->addMonth()" "$PAYMENT"
grep -qF 'no automatic renewal/recurring-charge path is implemented' "$LEGAL"
if grep -Fq 'La cancelación evita renovaciones posteriores' "$COPY"; then
  echo 'FAIL: refund copy implies a recurring renewal/cancellation path that is not implemented' >&2
  exit 1
fi
echo "fixed-period plan copy gate OK"
