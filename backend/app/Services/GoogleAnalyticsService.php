<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleAnalyticsService
{
    public function sendPurchase(
        object $payment,
        ?string $clientId = null,
        ?int $sessionId = null,
    ): array {
        $measurementId = (string) config('services.google_analytics.measurement_id', '');
        $apiSecret = (string) config('services.google_analytics.api_secret', '');

        if ($measurementId === '' || $apiSecret === '') {
            Log::warning('GA4 Measurement Protocol skipped: missing measurement id or API secret', [
                'payment_id' => $payment->id ?? null,
            ]);

            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'missing_configuration',
            ];
        }

        $transactionId = (string) (
            $payment->clip_payment_request_id
            ?? $payment->clip_checkout_id
            ?? $payment->id
        );
        $productId = (string) (
            $payment->product_code
            ?? (($payment->ad_id ?? null) ? 'ad_promotion_' . $payment->ad_id : 'payment_' . $payment->id)
        );
        $clientId = $this->normalizeClientId($clientId) ?: $this->fallbackClientId($payment);

        $eventParams = array_filter([
            'transaction_id' => $transactionId,
            'value' => (float) $payment->amount,
            'currency' => 'MXN',
            'engagement_time_msec' => 1,
            'session_id' => $sessionId && $sessionId > 0 ? $sessionId : null,
            'payment_type' => 'clip',
            'page_location' => config('app.frontend_url', 'https://mercasto.com') . '/?payment=success',
            'items' => [[
                'item_id' => $productId,
                'item_name' => (string) $payment->description,
                'item_category' => $this->itemCategory($productId),
                'price' => (float) $payment->amount,
                'quantity' => 1,
            ]],
        ], fn ($value) => $value !== null && $value !== '');

        $payload = array_filter([
            'client_id' => $clientId,
            'user_id' => isset($payment->user_id) ? (string) $payment->user_id : null,
            'timestamp_micros' => (int) floor(microtime(true) * 1_000_000),
            'events' => [[
                'name' => 'purchase',
                'params' => $eventParams,
            ]],
        ], fn ($value) => $value !== null && $value !== '');

        $endpoint = rtrim((string) config(
            'services.google_analytics.endpoint',
            'https://www.google-analytics.com/mp/collect'
        ), '?');
        $url = $endpoint
            . '?measurement_id=' . rawurlencode($measurementId)
            . '&api_secret=' . rawurlencode($apiSecret);

        try {
            $response = Http::timeout(5)
                ->retry(2, 200)
                ->acceptJson()
                ->post($url, $payload);
        } catch (\Throwable $e) {
            Log::warning('GA4 Measurement Protocol request failed', [
                'payment_id' => $payment->id ?? null,
                'transaction_id' => $transactionId,
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'skipped' => false,
                'reason' => 'request_failed',
            ];
        }

        if (! $response->successful()) {
            Log::warning('GA4 Measurement Protocol purchase was not accepted', [
                'payment_id' => $payment->id ?? null,
                'transaction_id' => $transactionId,
                'status' => $response->status(),
            ]);

            return [
                'ok' => false,
                'skipped' => false,
                'reason' => 'http_error',
                'status' => $response->status(),
            ];
        }

        return [
            'ok' => true,
            'skipped' => false,
            'transaction_id' => $transactionId,
            'status' => $response->status(),
        ];
    }

    public static function clientIdFromCookie(?string $cookie): ?string
    {
        $cookie = trim(urldecode((string) $cookie));
        if ($cookie === '') {
            return null;
        }

        if (preg_match('/(?:^|\.)(\d+\.\d+)$/', $cookie, $matches)) {
            return $matches[1];
        }

        return null;
    }

    public static function sessionIdFromCookie(?string $cookie): ?int
    {
        $cookie = trim(urldecode((string) $cookie));
        if ($cookie === '') {
            return null;
        }

        // Current GS2 cookie format: GS2.1.s<session_id>$o...$g...$t...
        if (preg_match('/(?:^|[.$])s(\d+)(?:\$|$)/', $cookie, $matches)) {
            return (int) $matches[1];
        }

        // Legacy GS1 cookie format: GS1.1.<session_id>.<session_number>....
        $parts = explode('.', $cookie);
        if (count($parts) >= 3 && str_starts_with($parts[0], 'GS') && ctype_digit($parts[2])) {
            return (int) $parts[2];
        }

        return null;
    }

    public static function sessionCookieName(?string $measurementId = null): string
    {
        $measurementId = $measurementId
            ?: (string) config('services.google_analytics.measurement_id', '');
        $suffix = preg_replace('/[^A-Za-z0-9]/', '', preg_replace('/^G-/', '', $measurementId));

        return '_ga_' . $suffix;
    }

    private function normalizeClientId(?string $clientId): ?string
    {
        $clientId = trim((string) $clientId);

        return preg_match('/^\d+\.\d+$/', $clientId) ? $clientId : null;
    }

    private function fallbackClientId(object $payment): string
    {
        $userPart = sprintf('%u', crc32('mercasto-user-' . (string) ($payment->user_id ?? 'guest')));
        $timePart = isset($payment->created_at)
            ? max(1, strtotime((string) $payment->created_at) ?: time())
            : time();

        return $userPart . '.' . $timePart;
    }

    private function itemCategory(string $productId): string
    {
        if (str_starts_with($productId, 'credits_')) {
            return 'credits';
        }

        if (str_starts_with($productId, 'package_') || str_contains($productId, 'monthly')) {
            return 'subscription';
        }

        if (str_contains($productId, 'boost')
            || str_contains($productId, 'featured')
            || str_contains($productId, 'highlight')
            || str_contains($productId, 'promotion')) {
            return 'ad_promotion';
        }

        return 'service';
    }
}
