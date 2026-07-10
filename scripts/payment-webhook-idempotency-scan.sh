#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/PaymentController.php"

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Payment webhook idempotency scan =="

test -f "$CONTROLLER"

grep -qF 'function handleWebhook' "$CONTROLLER"
grep -qF 'webhook_secret' "$CONTROLLER"
grep -qF 'hash_equals' "$CONTROLLER"
grep -qF "\$payload['resource_status']" "$CONTROLLER"
grep -qF "where('clip_checkout_id'" "$CONTROLLER"
grep -qF 'verifyClipCheckoutCompleted' "$CONTROLLER"
grep -qF "get('https://api.payclip.com/v2/checkout/'" "$CONTROLLER"
grep -qF "['completed', 'checkout_completed']" "$CONTROLLER"
grep -qF "\$verifiedCurrency !== 'MXN'" "$CONTROLLER"
grep -qF "where('status', '!=', 'paid')" "$CONTROLLER"
grep -qF "'status' => 'paid'" "$CONTROLLER"
grep -qF 'if ($updated)' "$CONTROLLER"
grep -qE "DB::table\('ad_promotions'\)->(insert|updateOrInsert)" "$CONTROLLER"
grep -qF 'defer(fn () => $this->sendMetaPurchase($meta, $request, $payment))->always()' "$CONTROLLER"
grep -qF "'currency' => 'MXN'" "$CONTROLLER"
grep -qF "'value' => (float) \$payment->amount" "$CONTROLLER"
grep -qF "'purchase_clip_' . \$payment->id" "$CONTROLLER"
grep -qF 'broadcast(new NewNotification' "$CONTROLLER"

updated_line="$(grep -nF 'if ($updated)' "$CONTROLLER" | head -1 | cut -d: -f1)"
promotion_line="$(grep -n -E "DB::table\('ad_promotions'\)->(insert|updateOrInsert)" "$CONTROLLER" | head -1 | cut -d: -f1)"
meta_purchase_line="$(grep -nF 'defer(fn () => $this->sendMetaPurchase($meta, $request, $payment))->always()' "$CONTROLLER" | head -1 | cut -d: -f1)"
notification_line="$(grep -nF 'broadcast(new NewNotification' "$CONTROLLER" | head -1 | cut -d: -f1)"

if [ -z "$updated_line" ] || [ -z "$promotion_line" ] || [ -z "$meta_purchase_line" ] || [ -z "$notification_line" ]; then
  echo "unable to locate webhook side-effect lines" >&2
  exit 1
fi

if [ "$promotion_line" -le "$updated_line" ] || [ "$meta_purchase_line" -le "$updated_line" ] || [ "$notification_line" -le "$updated_line" ]; then
  echo "webhook side effects appear before atomic paid-transition guard" >&2
  exit 1
fi

echo "payment webhook idempotency scan OK"
