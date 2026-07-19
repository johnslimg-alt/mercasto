<?php

namespace App\Services;

use App\Events\NewNotification;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AdRenewalService
{
    public function createCheckout(Request $request, object $ad): JsonResponse
    {
        if (empty(config('services.clip.api_key')) || empty(config('services.clip.api_secret'))) {
            Log::error('Clip API credentials not configured — ad renewal rejected');

            return response()->json([
                'success' => false,
                'message' => 'Servicio de pago no configurado temporalmente.',
            ], 503);
        }

        $amount = (float) config('marketplace.ad_renewal_price_mxn', 49);
        $days = (int) config('marketplace.ad_renewal_days', 7);
        $productCode = (string) config('marketplace.ad_renewal_product_code', 'ad_renewal_7_days');
        $description = "Renovación de anuncio por {$days} días (Anuncio #{$ad->id})";
        $checkoutId = 'clip_' . Str::uuid();

        // Never overwrite a previous checkout: an older Clip link may still be open
        // in the seller's browser and must remain fulfillable if it is paid.
        $paymentId = DB::table('payments')->insertGetId([
            'user_id' => $ad->user_id,
            'ad_id' => $ad->id,
            'clip_checkout_id' => $checkoutId,
            'amount' => $amount,
            'description' => $description,
            'product_code' => $productCode,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $clipToken = 'Basic ' . base64_encode(
            config('services.clip.api_key') . ':' . config('services.clip.api_secret')
        );

        try {
            $response = Http::timeout(15)
                ->withHeaders(['Authorization' => $clipToken])
                ->post('https://api.payclip.com/v2/checkout', [
                    'amount' => $amount,
                    'currency' => 'MXN',
                    'purchase_description' => $description,
                    'redirection_url' => [
                        'success' => config('app.frontend_url', 'https://mercasto.com') . "/profile?payment=success&renewed_ad={$ad->id}",
                        'error' => config('app.frontend_url', 'https://mercasto.com') . "/profile?payment=error&renewed_ad={$ad->id}",
                        'default' => config('app.frontend_url', 'https://mercasto.com') . '/profile',
                    ],
                    'metadata' => [
                        'external_reference' => $checkoutId,
                        'user_id' => (string) $ad->user_id,
                        'ad_id' => (string) $ad->id,
                        'purpose' => 'ad_renewal',
                    ],
                    'webhook_url' => config('app.url', 'https://mercasto.com') . '/api/webhooks/clip/ad-renewal',
                    'override_settings' => [
                        'locale' => 'es-MX',
                        'merchant_info' => ['show_contact_info' => false],
                    ],
                ]);
        } catch (\Throwable $error) {
            DB::table('payments')->where('id', $paymentId)->update([
                'status' => 'failed',
                'updated_at' => now(),
            ]);

            Log::error('Clip ad renewal checkout request failed', [
                'ad_id' => $ad->id,
                'payment_id' => $paymentId,
                'error' => $error->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Servicio de pago temporalmente no disponible. Inténtalo más tarde.',
            ], 503);
        }

        if (! $response->successful()) {
            DB::table('payments')->where('id', $paymentId)->update([
                'status' => 'failed',
                'clip_checkout_response' => json_encode($response->json()),
                'updated_at' => now(),
            ]);

            Log::warning('Clip rejected ad renewal checkout', [
                'ad_id' => $ad->id,
                'payment_id' => $paymentId,
                'status' => $response->status(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'No se pudo generar el pago de renovación.',
            ], 502);
        }

        $paymentUrl = $response->json('payment_request_url') ?: $response->json('payment_url');
        $paymentRequestId = $response->json('payment_request_id')
            ?: $response->json('id')
            ?: $response->json('payment_request.id');

        if (! $paymentUrl) {
            DB::table('payments')->where('id', $paymentId)->update([
                'status' => 'failed',
                'clip_checkout_response' => json_encode($response->json()),
                'updated_at' => now(),
            ]);

            Log::error('Clip ad renewal checkout response missing payment URL', [
                'ad_id' => $ad->id,
                'payment_id' => $paymentId,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Clip no devolvió un enlace de pago válido.',
            ], 502);
        }

        DB::table('payments')->where('id', $paymentId)->update([
            'clip_payment_request_id' => $paymentRequestId,
            'clip_payment_request_url' => $paymentUrl,
            'clip_checkout_response' => json_encode($response->json()),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => false,
            'payment_required' => true,
            'payment_url' => $paymentUrl,
            'amount' => $amount,
            'currency' => 'MXN',
            'days' => $days,
            'message' => "La publicación gratuita dura 7 días. Paga $" . number_format($amount, 0) . " MXN para renovarla por {$days} días más o elimínala sin costo.",
        ], 402);
    }

    public function fulfill(object $payment): ?Carbon
    {
        $notification = null;
        $days = (int) config('marketplace.ad_renewal_days', 7);
        $amount = (float) config('marketplace.ad_renewal_price_mxn', 49);

        $expiresAt = DB::transaction(function () use ($payment, &$notification, $days, $amount) {
            $lockedPayment = DB::table('payments')->where('id', $payment->id)->lockForUpdate()->first();
            if (! $lockedPayment || $lockedPayment->status === 'paid') {
                return null;
            }

            $ad = DB::table('ads')->where('id', $lockedPayment->ad_id)->lockForUpdate()->first();
            if (! $ad || (int) $ad->user_id !== (int) $lockedPayment->user_id) {
                Log::error('Ad renewal payment ownership mismatch', ['payment_id' => $lockedPayment->id]);
                return null;
            }

            $base = $ad->expires_at && Carbon::parse($ad->expires_at)->isFuture()
                ? Carbon::parse($ad->expires_at)
                : now();
            $newExpiry = $base->copy()->addDays($days);

            DB::table('ads')->where('id', $ad->id)->update([
                'status' => 'active',
                'expires_at' => $newExpiry,
                'reminder_sent_at' => null,
                'republished_at' => now(),
                'republish_count' => DB::raw('COALESCE(republish_count, 0) + 1'),
                'updated_at' => now(),
            ]);

            DB::table('payments')->where('id', $lockedPayment->id)->update([
                'status' => 'paid',
                'updated_at' => now(),
            ]);

            $notification = [
                'user_id' => $ad->user_id,
                'title' => '¡Anuncio renovado!',
                'message' => "Tu anuncio fue renovado por {$days} días después de confirmar el pago de $" . number_format($amount, 0) . ' MXN.',
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $notification['id'] = DB::table('user_notifications')->insertGetId($notification);

            return $newExpiry;
        });

        if ($expiresAt) {
            if ($notification) {
                broadcast(new NewNotification((int) $notification['user_id'], $notification))->toOthers();
            }
            $this->forgetAdCaches((int) $payment->ad_id);
        }

        return $expiresAt;
    }

    private function forgetAdCaches(int $adId): void
    {
        Cache::forget("ad_{$adId}");
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_featured_block');

        for ($page = 1; $page <= 10; $page++) {
            Cache::forget("ads_index_page_{$page}");
        }
    }
}
