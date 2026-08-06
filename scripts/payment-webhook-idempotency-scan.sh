#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/PaymentController.php"
TEST_FILE="backend/tests/Feature/ClipWebhookTest.php"

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
grep -qF "config('services.clip.verification_url'" "$CONTROLLER"
grep -qF "'verification_url' => env('CLIP_VERIFICATION_URL', 'https://api.payclip.com/v2/checkout')" backend/config/services.php
grep -qF "['completed', 'checkout_completed']" "$CONTROLLER"
grep -qF "\$verifiedCurrency !== 'MXN'" "$CONTROLLER"
test -f "$TEST_FILE"
grep -qF '$fulfillment = DB::transaction' "$CONTROLLER"
grep -qF -- '->lockForUpdate()' "$CONTROLLER"
grep -qF "if (! \$lockedPayment || \$lockedPayment->status === 'paid')" "$CONTROLLER"
grep -qF "'status' => 'paid'" "$CONTROLLER"
grep -qF '$this->activatePaidProduct($fulfilledPayment);' "$CONTROLLER"
grep -qF '$this->activateAdPromotion($fulfilledPayment);' "$CONTROLLER"
grep -qF "DB::table('ad_promotions')->updateOrInsert" "$CONTROLLER"
grep -qF 'if ($fulfillment)' "$CONTROLLER"
grep -qF 'defer(fn () => $this->sendMetaPurchase($meta, $request, $fulfilledPayment))->always()' "$CONTROLLER"
grep -qF "'currency' => 'MXN'" "$CONTROLLER"
grep -qF "'value' => (float) \$payment->amount" "$CONTROLLER"
grep -qF "'purchase_clip_' . \$payment->id" "$CONTROLLER"
grep -qF 'broadcast(new NewNotification' "$CONTROLLER"
grep -qF 'test_duplicate_completed_checkout_does_not_double_credit_balance' "$TEST_FILE"
grep -qF 'test_duplicate_completed_checkout_keeps_one_promotion_ledger_row' "$TEST_FILE"
grep -qF 'test_fulfillment_failure_rolls_back_paid_transition_and_credit_balance' "$TEST_FILE"

transaction_line="$(grep -nF '$fulfillment = DB::transaction' "$CONTROLLER" | head -1 | cut -d: -f1)"
lock_line="$(grep -nF -- '->lockForUpdate()' "$CONTROLLER" | head -1 | cut -d: -f1)"
paid_line="$(grep -nF "'status' => 'paid'" "$CONTROLLER" | head -1 | cut -d: -f1)"
product_line="$(grep -nF '$this->activatePaidProduct($fulfilledPayment);' "$CONTROLLER" | head -1 | cut -d: -f1)"
promotion_line="$(grep -nF '$this->activateAdPromotion($fulfilledPayment);' "$CONTROLLER" | head -1 | cut -d: -f1)"
notification_insert_line="$(grep -nF "DB::table('user_notifications')->insertGetId" "$CONTROLLER" | head -1 | cut -d: -f1)"
committed_line="$(grep -nF 'if ($fulfillment)' "$CONTROLLER" | head -1 | cut -d: -f1)"
meta_purchase_line="$(grep -nF 'defer(fn () => $this->sendMetaPurchase($meta, $request, $fulfilledPayment))->always()' "$CONTROLLER" | head -1 | cut -d: -f1)"
broadcast_line="$(grep -nF 'broadcast(new NewNotification' "$CONTROLLER" | head -1 | cut -d: -f1)"

for line in "$transaction_line" "$lock_line" "$paid_line" "$product_line" "$promotion_line" "$notification_insert_line" "$committed_line" "$meta_purchase_line" "$broadcast_line"; do
  if [ -z "$line" ]; then
    echo "unable to locate transactional webhook contract" >&2
    exit 1
  fi
done

if [ "$lock_line" -le "$transaction_line" ] ||
  [ "$paid_line" -le "$lock_line" ] ||
  [ "$product_line" -le "$paid_line" ] ||
  [ "$promotion_line" -le "$product_line" ] ||
  [ "$notification_insert_line" -le "$promotion_line" ] ||
  [ "$committed_line" -le "$notification_insert_line" ]; then
  echo "database fulfillment is not fully enclosed by the paid-transition transaction" >&2
  exit 1
fi

if [ "$meta_purchase_line" -le "$committed_line" ] || [ "$broadcast_line" -le "$committed_line" ]; then
  echo "external webhook side effects must run only after transaction commit" >&2
  exit 1
fi

echo "payment webhook idempotency scan OK"
