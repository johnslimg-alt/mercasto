<?php

namespace App\Http\Middleware;

use App\Services\GoogleAnalyticsService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use function Illuminate\Support\defer;

class TrackGoogleAnalyticsPurchase
{
    public function __construct(private readonly GoogleAnalyticsService $analytics)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $response->isSuccessful()) {
            return $response;
        }

        if ($this->isClipCheckout($request)) {
            $this->rememberCheckoutContext($request);
        }

        if ($this->isClipWebhook($request)) {
            $payload = $request->all();
            defer(fn () => $this->sendVerifiedPurchase($payload))->always();
        }

        return $response;
    }

    private function isClipCheckout(Request $request): bool
    {
        return $request->is('api/payment/clip', 'payment/clip') && $request->isMethod('post');
    }

    private function isClipWebhook(Request $request): bool
    {
        return $request->is(
            'api/webhooks/clip',
            'api/payment/webhook',
            'webhooks/clip',
            'payment/webhook',
        ) && $request->isMethod('post');
    }

    private function rememberCheckoutContext(Request $request): void
    {
        try {
            $user = $request->user();
            if (! $user) {
                return;
            }

            $query = DB::table('payments')
                ->where('user_id', $user->id)
                ->where('status', 'pending')
                ->where('updated_at', '>=', now()->subMinutes(3));

            if ($request->filled('product_code')) {
                $query->where('product_code', (string) $request->input('product_code'));
            }

            if ($request->filled('ad_id')) {
                $query->where('ad_id', (int) $request->input('ad_id'));
            } else {
                $query->whereNull('ad_id');
            }

            $payment = $query
                ->orderByDesc('updated_at')
                ->orderByDesc('id')
                ->first();

            if (! $payment) {
                return;
            }

            $measurementId = (string) config('services.google_analytics.measurement_id', '');
            $sessionCookie = GoogleAnalyticsService::sessionCookieName($measurementId);
            $context = array_filter([
                'client_id' => GoogleAnalyticsService::clientIdFromCookie($request->cookie('_ga')),
                'session_id' => GoogleAnalyticsService::sessionIdFromCookie($request->cookie($sessionCookie)),
            ], fn ($value) => $value !== null && $value !== '');

            Cache::put(
                $this->contextKey((int) $payment->id),
                $context,
                now()->addDay(),
            );
        } catch (\Throwable $e) {
            Log::warning('Unable to cache GA4 purchase context', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function sendVerifiedPurchase(array $payload): void
    {
        try {
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

            $payment = null;
            if ($paymentRequestId) {
                $payment = DB::table('payments')
                    ->where('clip_payment_request_id', $paymentRequestId)
                    ->first();
            }
            if (! $payment && $checkoutId) {
                $payment = DB::table('payments')
                    ->where('clip_checkout_id', $checkoutId)
                    ->first();
            }

            if (! $payment || $payment->status !== 'paid') {
                return;
            }

            $sentKey = $this->sentKey((int) $payment->id);
            try {
                if (! Cache::add($sentKey, 'sending', now()->addDays(35))) {
                    return;
                }
            } catch (\Throwable $e) {
                // The GA transaction_id provides a second deduplication layer if cache is unavailable.
                Log::warning('GA4 purchase deduplication cache unavailable', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }

            try {
                $context = Cache::get($this->contextKey((int) $payment->id), []);
            } catch (\Throwable $e) {
                $context = [];
                Log::warning('Unable to read GA4 purchase context', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }

            if (! is_array($context)) {
                $context = [];
            }

            $result = $this->analytics->sendPurchase(
                $payment,
                isset($context['client_id']) ? (string) $context['client_id'] : null,
                isset($context['session_id']) ? (int) $context['session_id'] : null,
            );

            if ($result['ok'] ?? false) {
                try {
                    Cache::put($sentKey, 'sent', now()->addDays(35));
                    Cache::forget($this->contextKey((int) $payment->id));
                } catch (\Throwable $e) {
                    Log::warning('Unable to finalize GA4 purchase cache state', [
                        'payment_id' => $payment->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                return;
            }

            try {
                Cache::forget($sentKey);
            } catch (\Throwable) {
                // A later Clip retry can still be deduplicated by transaction_id in GA4.
            }

            Log::warning('GA4 Purchase was not accepted', [
                'payment_id' => $payment->id,
                'reason' => $result['reason'] ?? null,
                'status' => $result['status'] ?? null,
                'skipped' => (bool) ($result['skipped'] ?? false),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Unable to send verified Clip purchase to GA4', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function firstString(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if (! is_scalar($value)) {
                continue;
            }

            $value = trim((string) $value);
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    private function contextKey(int $paymentId): string
    {
        return 'ga4_purchase_context:' . $paymentId;
    }

    private function sentKey(int $paymentId): string
    {
        return 'ga4_purchase_sent:' . $paymentId;
    }
}
