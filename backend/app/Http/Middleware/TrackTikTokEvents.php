<?php

namespace App\Http\Middleware;

use App\Services\TikTokEventsApiService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use function Illuminate\Support\defer;

class TrackTikTokEvents
{
    public function __construct(private readonly TikTokEventsApiService $tiktok)
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

            Cache::put(
                $this->contextKey((int) $payment->id),
                array_filter([
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'ttp' => $this->requestCookie($request, '_ttp'),
                    'ttclid' => $request->input('ttclid')
                        ?: $request->query('ttclid')
                        ?: $this->ttclidFromUrl((string) $request->headers->get('referer', '')),
                    'referrer' => $request->headers->get('referer'),
                ], fn ($value) => $value !== null && $value !== ''),
                now()->addDay(),
            );
        } catch (\Throwable $e) {
            Log::warning('Unable to cache TikTok purchase context', [
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
                Log::warning('TikTok Purchase deduplication cache unavailable', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }

            try {
                $context = Cache::get($this->contextKey((int) $payment->id), []);
            } catch (\Throwable $e) {
                $context = [];
                Log::warning('Unable to read TikTok purchase context', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }

            if (! is_array($context)) {
                $context = [];
            }

            $productId = $payment->product_code
                ?: ($payment->ad_id ? 'ad_promotion_' . $payment->ad_id : 'payment_' . $payment->id);
            $orderId = $payment->clip_payment_request_id
                ?: $payment->clip_checkout_id
                ?: (string) $payment->id;
            $request = Request::create(
                config('app.url', 'https://mercasto.com') . '/api/webhooks/clip',
                'POST',
                [],
                [],
                [],
                [
                    'REMOTE_ADDR' => $context['ip'] ?? '127.0.0.1',
                    'HTTP_USER_AGENT' => $context['user_agent'] ?? 'Mercasto TikTok Events API',
                ]
            );

            $result = $this->tiktok->send(
                'Purchase',
                $request,
                DB::table('users')->where('id', $payment->user_id)->first(),
                [
                    'currency' => 'MXN',
                    'value' => (float) $payment->amount,
                    'order_id' => (string) $orderId,
                    'content_ids' => [(string) $productId],
                    'contents' => [[
                        'content_id' => (string) $productId,
                        'content_type' => 'product',
                        'content_name' => (string) $payment->description,
                        'price' => (float) $payment->amount,
                        'quantity' => 1,
                    ]],
                    'content_type' => 'product',
                    'content_name' => (string) $payment->description,
                    'quantity' => 1,
                    'status' => 'paid',
                ],
                'purchase_clip_' . $payment->id,
                config('app.frontend_url', 'https://mercasto.com') . '/?payment=success',
                $context,
            );

            if ($result['ok'] ?? false) {
                try {
                    Cache::put($sentKey, 'sent', now()->addDays(35));
                    Cache::forget($this->contextKey((int) $payment->id));
                } catch (\Throwable $e) {
                    Log::warning('Unable to finalize TikTok Purchase cache state', [
                        'payment_id' => $payment->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                return;
            }

            try {
                Cache::forget($sentKey);
            } catch (\Throwable) {
                // A later Clip retry can try again with the same stable event_id.
            }

            Log::warning('TikTok Purchase was not accepted', [
                'payment_id' => $payment->id,
                'event_id' => $result['event_id'] ?? null,
                'reason' => $result['reason'] ?? null,
                'status' => $result['status'] ?? null,
                'code' => $result['code'] ?? null,
                'skipped' => (bool) ($result['skipped'] ?? false),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Unable to send verified Clip purchase to TikTok', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function requestCookie(Request $request, string $cookieName): ?string
    {
        if ($value = $request->cookie($cookieName)) {
            return substr(trim((string) $value), 0, 512);
        }

        foreach (explode(';', (string) $request->headers->get('cookie', '')) as $pair) {
            [$name, $rawValue] = array_pad(explode('=', trim($pair), 2), 2, null);
            if ($rawValue !== null && rawurldecode(trim((string) $name)) === $cookieName) {
                return substr(trim(rawurldecode($rawValue)), 0, 512);
            }
        }

        return null;
    }

    private function ttclidFromUrl(string $url): ?string
    {
        $query = $url !== '' ? parse_url($url, PHP_URL_QUERY) : null;
        if (! is_string($query)) {
            return null;
        }

        parse_str($query, $params);
        $ttclid = $params['ttclid'] ?? null;

        return is_scalar($ttclid) && trim((string) $ttclid) !== ''
            ? substr(trim((string) $ttclid), 0, 512)
            : null;
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
        return 'tiktok_purchase_context:' . $paymentId;
    }

    private function sentKey(int $paymentId): string
    {
        return 'tiktok_purchase_sent:' . $paymentId;
    }
}
