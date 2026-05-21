#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ROUTES="backend/routes/api.php"
PAYMENT="backend/app/Http/Controllers/Api/PaymentController.php"
READINESS="scripts/billing-readiness-smoke.sh"
IDEMPOTENCY="scripts/payment-webhook-idempotency-scan.sh"
RETENTION="scripts/payment-retention-scan.sh"
ENV_SMOKE="scripts/production-env-readiness-smoke.sh"

echo "== Payment launch gate =="

test -f "$ROUTES"
test -f "$PAYMENT"
test -f "$READINESS"
test -f "$IDEMPOTENCY"
test -f "$RETENTION"
test -f "$ENV_SMOKE"

# Route coverage: checkout, webhook, user/admin payment visibility and coupon redemption.
grep -qF "Route::post('/webhooks/clip', [PaymentController::class, 'handleWebhook'])" "$ROUTES"
grep -qF "Route::post('/payment/clip', [PaymentController::class, 'createClipCheckout'])" "$ROUTES"
grep -qF "Route::get('/user/payments', [PaymentController::class, 'getUserPayments'])" "$ROUTES"
grep -qF "Route::get('/admin/payments', [PaymentController::class, 'getAdminPayments'])" "$ROUTES"
grep -qF "Route::post('/user/coupons/redeem', [PaymentController::class, 'redeemCoupon'])" "$ROUTES"

# Checkout must fail closed before local state mutation when provider credentials are absent.
grep -qF "createClipCheckout" "$PAYMENT"
grep -qF "Clip API credentials not configured" "$PAYMENT"
grep -qF "Servicio de pago no configurado temporalmente" "$PAYMENT"
grep -qF "return response()->json([" "$PAYMENT"
grep -qF "], 503)" "$PAYMENT"

# Checkout must enforce server-side pricing and ownership, not client-submitted business effects.
grep -qF "Client-Side Pricing Exploit" "$PAYMENT"
grep -qF "Suscripción Paquete Plus" "$PAYMENT"
grep -qF "Suscripción PRO Estándar" "$PAYMENT"
grep -qF "Suscripción PRO Ilimitado" "$PAYMENT"
grep -qF "No tienes permisos para promocionar este anuncio." "$PAYMENT"
grep -qF "Solo puedes promocionar anuncios que estén activos." "$PAYMENT"
grep -qF "Este anuncio ya está destacado." "$PAYMENT"
grep -qF "Servicio no válido" "$PAYMENT"

# Local pending payment rows must be created/reused before provider checkout, with a local reference.
grep -qF "DB Bloat DoS" "$PAYMENT"
grep -qF "status' => 'pending'" "$PAYMENT"
grep -qF "clip_checkout_id" "$PAYMENT"
grep -qF "reference" "$PAYMENT"
grep -qF "redirection_url" "$PAYMENT"
grep -qF "payment_url" "$PAYMENT"

# Webhook must be the source of truth and must fail closed on missing/invalid signature.
grep -qF "public function handleWebhook" "$PAYMENT"
grep -qF "services.clip.webhook_secret" "$PAYMENT"
grep -qF "CLIP_WEBHOOK_SECRET not configured" "$PAYMENT"
grep -qF "X-Clip-Signature" "$PAYMENT"
grep -qF "X-Webhook-Signature" "$PAYMENT"
grep -qF "hash_hmac('sha256'" "$PAYMENT"
grep -qF "hash_equals" "$PAYMENT"
grep -qF "invalid_signature" "$PAYMENT"
grep -qF "], 401)" "$PAYMENT"

# Business effects must only occur inside the confirmed paid webhook branch.
grep -qF "status'] === 'paid'" "$PAYMENT"
grep -qF "where('status', '!=', 'paid')" "$PAYMENT"
grep -qF "Race Condition" "$PAYMENT"
grep -qF "update(['role' => 'business'])" "$PAYMENT"
grep -qF "increment('balance'" "$PAYMENT"
grep -qF "promoted' => 'destacado'" "$PAYMENT"
grep -qF "ad_promotions" "$PAYMENT"
grep -qF "¡Pago exitoso!" "$PAYMENT"

# Existing billing scans must remain wired and cover unsigned webhook/idempotency/retention.
grep -qF "unsigned webhook" "$READINESS"
grep -qF "401" "$READINESS"
grep -qF "503" "$READINESS"
grep -qF "hash_equals" "$IDEMPOTENCY"
grep -qF "where('status', '!=', 'paid')" "$IDEMPOTENCY"
grep -qF "Financial/audit retention" "$RETENTION"
grep -qF "MERCASTO_PROD_EXPECTED_HOST" "$ENV_SMOKE"
grep -qF "CLIP" "$ENV_SMOKE"

echo "payment launch gate OK"
