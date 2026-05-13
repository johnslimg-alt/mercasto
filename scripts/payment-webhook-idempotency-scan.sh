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

grep -q 'function handleWebhook' "$CONTROLLER"
grep -q 'webhook_secret' "$CONTROLLER"
grep -q 'hash_equals' "$CONTROLLER"
grep -q "where('clip_checkout_id'" "$CONTROLLER"
grep -q "where('status', '!=', 'paid')" "$CONTROLLER"
grep -q "'status' => 'paid'" "$CONTROLLER"
grep -q 'if ($updated)' "$CONTROLLER"
grep -q "DB::table('ad_promotions')->insert" "$CONTROLLER"
grep -q "broadcast(new NewNotification" "$CONTROLLER"

updated_line="$(grep -n 'if (\$updated)' "$CONTROLLER" | head -1 | cut -d: -f1)"
promotion_line="$(grep -n "DB::table('ad_promotions')->insert" "$CONTROLLER" | head -1 | cut -d: -f1)"
notification_line="$(grep -n 'broadcast(new NewNotification' "$CONTROLLER" | head -1 | cut -d: -f1)"

if [ -z "$updated_line" ] || [ -z "$promotion_line" ] || [ -z "$notification_line" ]; then
  echo "unable to locate webhook side-effect lines" >&2
  exit 1
fi

if [ "$promotion_line" -le "$updated_line" ] || [ "$notification_line" -le "$updated_line" ]; then
  echo "webhook side effects appear before atomic paid-transition guard" >&2
  exit 1
fi

echo "payment webhook idempotency scan OK"
