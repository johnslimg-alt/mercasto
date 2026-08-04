<?php

use App\Support\PaymentPayloadSanitizer;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('payments')
            ->select([
                'id',
                'status',
                'webhook_payload',
                'clip_checkout_response',
                'clip_payment_request_url',
                'updated_at',
            ])
            ->orderBy('id')
            ->chunkById(100, function ($payments): void {
                foreach ($payments as $payment) {
                    $updates = [];

                    if ($payment->webhook_payload !== null) {
                        $safeWebhook = PaymentPayloadSanitizer::legacyWebhook(
                            $payment->webhook_payload,
                            $payment->updated_at,
                        );
                        $updates['webhook_payload'] = $safeWebhook === null
                            ? null
                            : json_encode($safeWebhook, JSON_UNESCAPED_SLASHES);
                    }

                    if ($payment->clip_checkout_response !== null) {
                        $safeCheckout = PaymentPayloadSanitizer::legacyCheckout(
                            $payment->clip_checkout_response,
                            $payment->updated_at,
                        );
                        $updates['clip_checkout_response'] = $safeCheckout === null
                            ? null
                            : json_encode($safeCheckout, JSON_UNESCAPED_SLASHES);
                    }

                    if (in_array($payment->status, ['paid', 'failed', 'expired'], true)
                        && $payment->clip_payment_request_url !== null) {
                        $updates['clip_payment_request_url'] = null;
                    }

                    if ($updates !== []) {
                        DB::table('payments')
                            ->where('id', $payment->id)
                            ->update($updates);
                    }
                }
            });
    }

    public function down(): void
    {
        // Privacy minimization is intentionally irreversible: discarded provider
        // payload fields must never be reconstructed or restored.
    }
};
