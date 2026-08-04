#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SANITIZER="backend/app/Support/PaymentPayloadSanitizer.php"
PAYMENT="backend/app/Http/Controllers/Api/PaymentController.php"
RENEWAL="backend/app/Services/AdRenewalService.php"
RENEWAL_WEBHOOK="backend/app/Http/Controllers/Api/AdRenewalWebhookController.php"
EXPIRY="backend/app/Console/Commands/ExpirePendingPayments.php"
MIGRATION="backend/database/migrations/2026_08_04_170000_minimize_payment_provider_payloads.php"
TEST="backend/tests/Feature/PaymentPayloadPrivacyTest.php"

echo "== Payment payload privacy gate =="

for file in "$SANITIZER" "$PAYMENT" "$RENEWAL" "$RENEWAL_WEBHOOK" "$EXPIRY" "$MIGRATION" "$TEST"; do
  test -f "$file"
done

grep -qF 'final class PaymentPayloadSanitizer' "$SANITIZER"
grep -qF "'schema_version' => self::SCHEMA_VERSION" "$SANITIZER"
grep -qF "PaymentPayloadSanitizer::webhook(\$payload)" "$PAYMENT"
grep -qF "PaymentPayloadSanitizer::internal('account_balance')" "$PAYMENT"
grep -qF "PaymentPayloadSanitizer::webhook(\$payload, 'verified_ad_renewal')" "$RENEWAL_WEBHOOK"
grep -qF 'PaymentPayloadSanitizer::checkout(' "$RENEWAL"
grep -qF "'clip_payment_request_url' => null" "$EXPIRY"
grep -qF 'PaymentPayloadSanitizer::legacyWebhook' "$MIGRATION"
grep -qF 'PaymentPayloadSanitizer::legacyCheckout' "$MIGRATION"

if grep -RInE "webhook_payload.*json_encode\(\$payload\)" \
  "$PAYMENT" "$RENEWAL_WEBHOOK"; then
  echo "raw provider webhook payload is stored" >&2
  exit 1
fi

if grep -RInE "clip_checkout_response.*json_encode\(\$response->json\(\)\)" \
  "$PAYMENT" "$RENEWAL"; then
  echo "raw provider checkout response is stored" >&2
  exit 1
fi

if grep -RInE "('body'|'error')[[:space:]]*=>[[:space:]]*\$response->json\(\)" \
  "$PAYMENT" "$RENEWAL"; then
  echo "raw provider response is logged or returned to the client" >&2
  exit 1
fi

python3 - "$PAYMENT" "$RENEWAL" "$RENEWAL_WEBHOOK" <<'CHECKPY'
from pathlib import Path
import sys

for filename in sys.argv[1:]:
    text = Path(filename).read_text()
    if '->getMessage()' in text:
        raise SystemExit(f'exception message logging is forbidden in payment flow: {filename}')
CHECKPY

if grep -RInE "\$table->[^;]*(pan|card_number|cardholder|cvv|cvc|expiry_month|expiry_year)" \
  backend/database/migrations/*payments*; then
  echo "payment table must not store cardholder or card credential fields" >&2
  exit 1
fi

grep -qF "'last4' => '4242'" "$TEST"
grep -qF "'payer' => ['phone'" "$TEST"
grep -qF 'assertStringNotContainsString' "$TEST"
grep -qF "'clip_payment_request_url' => null" "$TEST"

echo "payment payload privacy gate OK"
