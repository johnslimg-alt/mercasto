<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AdRenewalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdRenewalWebhookController extends Controller
{
    public function __invoke(Request $request, AdRenewalService $renewals): JsonResponse
    {
        $payload = $request->all();
        $checkoutId = $this->firstString(
            $payload['reference'] ?? null,
            data_get($payload, 'metadata.external_reference'),
            data_get($payload, 'payment_request.metadata.external_reference'),
            $payload['merch_inv_id'] ?? null,
            $payload['me_reference_id'] ?? null,
        );
        $paymentRequestId = $this->firstString(
            $payload['payment_request_id'] ?? null,
            data_get($payload, 'payment_request.id'),
            data_get($payload, 'payment_request.payment_request_id'),
        );
        $resource = strtoupper($this->firstString(
            $payload['resource'] ?? null,
            data_get($payload, 'payment_request.resource'),
        ) ?? '');
        $status = $this->normalizeStatus($this->firstString(
            $payload['resource_status'] ?? null,
            $payload['status'] ?? null,
            data_get($payload, 'payment_request.resource_status'),
            data_get($payload, 'payment_request.status'),
        ));

        if ($invalid = $this->validateOptionalSignature($request)) {
            return $invalid;
        }

        if ($resource !== '' && $resource !== 'CHECKOUT') {
            return response()->json(['status' => 'received']);
        }

        if (! $checkoutId && ! $paymentRequestId) {
            return response()->json(['status' => 'test_ok']);
        }

        $productCode = (string) config('marketplace.ad_renewal_product_code', 'ad_renewal_7_days');
        $paymentQuery = DB::table('payments')->where('product_code', $productCode);
        $payment = $paymentRequestId
            ? (clone $paymentQuery)->where('clip_payment_request_id', $paymentRequestId)->first()
            : (clone $paymentQuery)->where('clip_checkout_id', $checkoutId)->first();

        if (! $payment) {
            Log::info('Clip renewal webhook references an unknown checkout');
            return response()->json(['status' => 'received']);
        }

        if ($payment->status === 'paid') {
            return response()->json(['status' => 'received']);
        }

        if (! in_array($status, [
            'paid', 'approved', 'succeeded', 'success', 'completed',
            'checkout_completed', 'payment_completed',
        ], true)) {
            return response()->json(['status' => 'received']);
        }

        $verificationId = (string) ($paymentRequestId ?: $payment->clip_payment_request_id);
        $verification = $this->verifyCompletedCheckout($verificationId, $payment);
        if (! $verification['ok']) {
            return response()->json(
                ['status' => $verification['reason']],
                $verification['http_status']
            );
        }

        DB::table('payments')->where('id', $payment->id)->update([
            'clip_payment_request_id' => $verificationId,
            'webhook_payload' => json_encode($payload),
            'updated_at' => now(),
        ]);

        $payment = DB::table('payments')->where('id', $payment->id)->first();
        $expiresAt = $renewals->fulfill($payment);

        return response()->json([
            'status' => $expiresAt ? 'renewed' : 'received',
            'expires_at' => $expiresAt?->toIso8601String(),
        ]);
    }

    private function verifyCompletedCheckout(string $paymentRequestId, object $payment): array
    {
        if (! preg_match('/^[A-Za-z0-9-]{1,64}$/', $paymentRequestId)) {
            return ['ok' => false, 'reason' => 'invalid_payment_request_id', 'http_status' => 422];
        }

        $apiKey = config('services.clip.api_key');
        $apiSecret = config('services.clip.api_secret');
        if (empty($apiKey) || empty($apiSecret)) {
            return ['ok' => false, 'reason' => 'verification_misconfigured', 'http_status' => 503];
        }

        try {
            $response = Http::timeout(10)
                ->retry(2, 250)
                ->withHeaders([
                    'Authorization' => 'Basic ' . base64_encode($apiKey . ':' . $apiSecret),
                    'Accept' => 'application/json',
                ])
                ->get('https://api.payclip.com/v2/checkout/' . rawurlencode($paymentRequestId));
        } catch (\Throwable $error) {
            Log::warning('Clip renewal verification request failed', [
                'payment_id' => $payment->id,
                'error' => $error->getMessage(),
            ]);

            return ['ok' => false, 'reason' => 'verification_unavailable', 'http_status' => 503];
        }

        if (! $response->successful()) {
            return ['ok' => false, 'reason' => 'verification_unavailable', 'http_status' => 503];
        }

        $verifiedId = (string) ($response->json('payment_request_id')
            ?? $response->json('payment_request.payment_request_id')
            ?? '');
        $verifiedStatus = $this->normalizeStatus(
            $response->json('status') ?? $response->json('payment_request.status')
        );
        $verifiedAmount = $response->json('amount') ?? $response->json('payment_request.amount');
        $verifiedCurrency = strtoupper((string) (
            $response->json('currency') ?? $response->json('payment_request.currency') ?? ''
        ));

        if ($verifiedId === '' || ! hash_equals($paymentRequestId, $verifiedId)) {
            return ['ok' => false, 'reason' => 'verification_mismatch', 'http_status' => 409];
        }

        if (! in_array($verifiedStatus, ['completed', 'checkout_completed'], true)) {
            return ['ok' => false, 'reason' => 'checkout_not_completed', 'http_status' => 409];
        }

        if (! is_numeric($verifiedAmount)
            || abs((float) $verifiedAmount - (float) $payment->amount) > 0.009
            || abs((float) $payment->amount - (float) config('marketplace.ad_renewal_price_mxn', 49)) > 0.009
            || $verifiedCurrency !== 'MXN') {
            return ['ok' => false, 'reason' => 'verification_mismatch', 'http_status' => 409];
        }

        return ['ok' => true, 'reason' => null, 'http_status' => 200];
    }

    private function validateOptionalSignature(Request $request): ?JsonResponse
    {
        $signature = $request->header('X-Clip-Signature') ?? $request->header('X-Webhook-Signature');
        if (! $signature) {
            return null;
        }

        $secret = config('services.clip.webhook_secret');
        if (empty($secret)) {
            return response()->json(['status' => 'misconfigured'], 503);
        }

        $expected = hash_hmac('sha256', $request->getContent(), $secret);
        $received = str_starts_with((string) $signature, 'sha256=')
            ? substr((string) $signature, 7)
            : (string) $signature;

        return hash_equals($expected, $received)
            ? null
            : response()->json(['status' => 'invalid_signature'], 401);
    }

    private function normalizeStatus(mixed $status): string
    {
        return is_scalar($status)
            ? strtolower(str_replace(['-', ' '], '_', trim((string) $status)))
            : '';
    }

    private function firstString(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if (is_scalar($value) && trim((string) $value) !== '') {
                return trim((string) $value);
            }
        }

        return null;
    }
}
