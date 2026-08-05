#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Paid renewal contract gate =="
grep -qF "'checkout_url' => env('CLIP_CHECKOUT_URL'" backend/config/services.php
grep -qF "'verification_url' => env('CLIP_VERIFICATION_URL'" backend/config/services.php
grep -qF "config('services.clip.checkout_url')" backend/app/Services/AdRenewalService.php
grep -qF "config('services.clip.checkout_url')" backend/app/Http/Controllers/Api/PaymentController.php
grep -qF 'isSafePaymentUrl(payload?.payment_url' src/utils/paidAdRenewalBridge.js
grep -qF 'res.status === 402 && data.payment_required' src/App.jsx
node --test tests/paid-ad-renewal-bridge.test.mjs
echo "paid renewal contract gate OK"
