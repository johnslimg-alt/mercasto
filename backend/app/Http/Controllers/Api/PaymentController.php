<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Events\NewNotification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    private const SUBSCRIPTION_PLANS = [
        'package_impulso' => ['name' => 'Plan Impulso', 'limit' => 10, 'business' => false],
        'package_negocio' => ['name' => 'Plan Negocio', 'limit' => 30, 'business' => true],
        'package_pro' => ['name' => 'Plan Pro', 'limit' => 100, 'business' => true],
        'package_agencia' => ['name' => 'Plan Agencia', 'limit' => 500, 'business' => true],
        'plus_monthly' => ['name' => 'Suscripción Paquete Plus', 'limit' => 10, 'business' => false],
        'pro_standard_monthly' => ['name' => 'Suscripción PRO Estándar', 'limit' => 50, 'business' => true],
        'pro_unlimited_monthly' => ['name' => 'Suscripción PRO Ilimitado', 'limit' => 999999, 'business' => true],
    ];

    /**
     * Создание сессии оплаты через Clip Mexico
     */
    public function createClipCheckout(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string|max:255',
            'product_code' => 'nullable|string|in:package_free,package_impulso,package_negocio,package_pro,package_agencia,credits_100,boost_1_day,boost_3_days,highlight_7_days,featured_7_days,featured_30_days,top_category_7_days,plus_monthly,pro_standard_monthly,pro_unlimited_monthly',
            'ad_id' => 'nullable|integer|exists:ads,id', // Защита от создания призрачных платежей
        ]);

        // Fail closed before mutating payment state when Clip credentials are not configured.
        if (empty(config('services.clip.api_key')) || empty(config('services.clip.api_secret'))) {
            Log::error('Clip API credentials not configured — checkout rejected');
            return response()->json([
                'success' => false,
                'message' => 'Servicio de pago no configurado temporalmente',
            ], 503);
        }

        $user = $request->user();
        $checkoutId = 'clip_' . Str::uuid();

        $amount = (float) $request->amount;
        $description = $request->description;

        // Защита от подмены цен (Client-Side Pricing Exploit): Жестко фиксируем все цены
        $packagesByCode = [
            'package_free' => ['amount' => 0, 'description' => 'Plan Gratis'],
            'package_impulso' => ['amount' => 99, 'description' => 'Plan Impulso'],
            'package_negocio' => ['amount' => 249, 'description' => 'Plan Negocio'],
            'package_pro' => ['amount' => 599, 'description' => 'Plan Pro'],
            'package_agencia' => ['amount' => 1499, 'description' => 'Plan Agencia'],
            'credits_100' => ['amount' => 100, 'description' => '100 Créditos Mercasto'],
            'boost_1_day' => ['amount' => 19, 'description' => 'Subir 24 horas'],
            'boost_3_days' => ['amount' => 49, 'description' => 'Subir 3 días'],
            'highlight_7_days' => ['amount' => 79, 'description' => 'Resaltar 7 días'],
            'featured_7_days' => ['amount' => 149, 'description' => 'Destacado 7 días'],
            'featured_30_days' => ['amount' => 399, 'description' => 'Destacado 30 días'],
            'top_category_7_days' => ['amount' => 399, 'description' => 'Top categoría 7 días'],
            // Legacy/fallback support
            'plus_monthly' => ['amount' => 99, 'description' => 'Suscripción Paquete Plus'],
            'pro_standard_monthly' => ['amount' => 500, 'description' => 'Suscripción PRO Estándar'],
            'pro_unlimited_monthly' => ['amount' => 1500, 'description' => 'Suscripción PRO Ilimitado'],
        ];

        $legacyPackages = [
            'Suscripción Paquete Plus' => 'plus_monthly',
            'Suscripción PRO Estándar' => 'pro_standard_monthly',
            'Suscripción PRO Ilimitado' => 'pro_unlimited_monthly',
        ];
        
        if ($request->ad_id) {
            // Защита от IDOR: убеждаемся, что пользователь продвигает только свои объявления
            $ad = DB::table('ads')->where('id', $request->ad_id)->first();
            if (!$ad || $ad->user_id !== $user->id) {
                return response()->json(['message' => 'No tienes permisos para promocionar este anuncio.'], 403);
            }
            
            // Финансовая защита (Fraud Prevention): блокируем оплату для уже продвинутых или неактивных объявлений
            if ($ad->status !== 'active') {
                return response()->json(['message' => 'Solo puedes promocionar anuncios que estén activos.'], 400);
            }

            // If a valid boost product code is supplied with ad_id, use its price/description. Otherwise fallback to standard promotion.
            $productCode = $request->product_code;
            if ($productCode && array_key_exists($productCode, $packagesByCode)) {
                $amount = (float) $packagesByCode[$productCode]['amount'];
                $description = $packagesByCode[$productCode]['description'] . " (Anuncio #" . $request->ad_id . ")";
            } else {
                $amount = 50; // Жесткая цена за продвижение по умолчанию
                $description = "Promoción de anuncio #" . $request->ad_id;
            }
        } else {
            $productCode = $request->product_code ?: ($legacyPackages[$description] ?? null);
            if (! $productCode || ! array_key_exists($productCode, $packagesByCode)) {
                return response()->json(['message' => 'Servicio no válido'], 400);
            }

            if ($this->promotionConfig($productCode)) {
                return response()->json(['message' => 'Selecciona un anuncio antes de comprar promoción.'], 400);
            }
 
            $amount = (float) $packagesByCode[$productCode]['amount'];
            $description = $packagesByCode[$productCode]['description'];
        }

        // Защита от DB Bloat DoS: переиспользуем 'pending' сессии
        $existing = DB::table('payments')->where(['user_id' => $user->id, 'ad_id' => $request->ad_id, 'description' => $description, 'status' => 'pending'])->first();
        if ($existing) {
            DB::table('payments')->where('id', $existing->id)->update([
                'clip_checkout_id' => $checkoutId,
                'product_code' => $productCode,
                'amount' => $amount,
                'updated_at' => now(),
            ]);
        } else {
            DB::table('payments')->insert([
                'user_id' => $user->id, 'ad_id' => $request->ad_id, 'clip_checkout_id' => $checkoutId, 
                'amount' => $amount, 'description' => $description, 'product_code' => $productCode, 'status' => 'pending',
                'created_at' => now(), 'updated_at' => now()
            ]);
        }

        $clipToken = 'Basic ' . base64_encode(config('services.clip.api_key') . ':' . config('services.clip.api_secret'));

        try {
            $response = Http::timeout(15)
            ->withHeaders(['Authorization' => $clipToken])
            ->post('https://api.payclip.com/v2/checkout', [
                'amount' => $amount,
                'currency' => 'MXN',
                'purchase_description' => $description,
                'redirection_url' => [
                    'success' => config('app.frontend_url', 'https://mercasto.com') . '/?payment=success',
                    'error'   => config('app.frontend_url', 'https://mercasto.com') . '/?payment=error',
                    'default' => config('app.frontend_url', 'https://mercasto.com')
                ],
                'metadata' => [
                    'external_reference' => $checkoutId,
                    'user_id' => (string) $user->id,
                    'ad_id' => $request->ad_id ? (string) $request->ad_id : null,
                ],
                'webhook_url' => config('app.url', 'https://mercasto.com') . '/api/webhooks/clip',
                'override_settings' => [
                    'locale' => 'es-MX',
                    'merchant_info' => ['show_contact_info' => false],
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Clip checkout request failed', [
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Servicio de pago temporalmente no disponible. Inténtalo más tarde.',
            ], 503);
        }

        if ($response->successful()) {
            $paymentUrl = $response->json('payment_request_url') ?: $response->json('payment_url');
            $paymentRequestId = $response->json('payment_request_id')
                ?: $response->json('id')
                ?: $response->json('payment_request.id');

            if (! $paymentUrl) {
                Log::error('Clip checkout response missing payment URL', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Clip no devolvió un enlace de pago válido.',
                ], 502);
            }

            DB::table('payments')->where('clip_checkout_id', $checkoutId)->update([
                'clip_payment_request_id' => $paymentRequestId,
                'clip_payment_request_url' => $paymentUrl,
                'clip_checkout_response' => json_encode($response->json()),
                'updated_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Checkout generado',
                'payment_url' => $paymentUrl,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Error al generar el pago',
            'error' => $response->json()
        ], 400);
    }

    /**
     * Обработка веб-хука от Clip
     */
    public function handleWebhook(Request $request)
    {
        // Verify webhook signature — FAIL CLOSED: reject if secret not configured
        $secret = config('services.clip.webhook_secret');
        if (empty($secret)) {
            Log::error('CLIP_WEBHOOK_SECRET not configured — webhook rejected');
            return response()->json(['status' => 'misconfigured'], 503);
        }

        $payload = $request->all();
        $checkoutId = $payload['reference']
            ?? data_get($payload, 'metadata.external_reference')
            ?? data_get($payload, 'payment_request.metadata.external_reference');
        $paymentRequestId = $payload['payment_request_id']
            ?? $payload['id']
            ?? data_get($payload, 'payment_request.id')
            ?? data_get($payload, 'payment_request.payment_request_id');
        $paymentStatus = strtolower((string) ($payload['status'] ?? data_get($payload, 'payment_request.status', '')));

        $signature = $request->header('X-Clip-Signature') ?? $request->header('X-Webhook-Signature');
        $expectedSignature = hash_hmac('sha256', $request->getContent(), $secret);
        // Защита от криптографического бага ltrim (удалял нужные символы хэша, если они совпадали с маской)
        $receivedHash = str_starts_with((string) $signature, 'sha256=') ? substr((string) $signature, 7) : (string) $signature;

        $paidStatuses = [
            'paid',
            'approved',
            'succeeded',
            'success',
            'completed',
            'checkout_completed',
            'payment_completed',
        ];

        if (!$signature || !hash_equals($expectedSignature, $receivedHash)) {
            // IF THE SIGNATURE IS PRESENT BUT INVALID, IT MUST BE REJECTED IMMEDIATELY!
            if ($signature) {
                $clientIpHash = hash('sha256', (string) $request->ip());
                Log::warning('Invalid Clip webhook signature provided', [
                    'ip_hash' => $clientIpHash,
                    'path' => $request->path(),
                    'checkout_id_present' => (bool) $checkoutId,
                    'status' => $paymentStatus ?: null,
                ]);
                return response()->json(['status' => 'invalid_signature'], 401);
            }

            // Clip dashboard can send an unsigned test ping. Accept only non-payment pings,
            // never unsigned events that claim a checkout reference or paid status.
            if (!$signature && !$checkoutId && !in_array($paymentStatus, $paidStatuses, true)) {
                Log::info('Unsigned Clip webhook test ping accepted', [
                    'ip_hash' => hash('sha256', (string) $request->ip()),
                    'status' => $paymentStatus ?: null,
                ]);

                return response()->json(['status' => 'test_ok']);
            }

            $knownCheckout = $checkoutId
                ? DB::table('payments')->where('clip_checkout_id', $checkoutId)->exists()
                : false;
            $knownPaymentRequest = $paymentRequestId
                ? DB::table('payments')->where('clip_payment_request_id', $paymentRequestId)->exists()
                : false;

            if (!$knownCheckout && !$knownPaymentRequest) {
                Log::info('Unsigned Clip webhook test/unknown checkout accepted', [
                    'ip_hash' => hash('sha256', (string) $request->ip()),
                    'path' => $request->path(),
                    'payload_keys' => array_keys($payload),
                    'checkout_id_present' => (bool) $checkoutId,
                    'payment_request_id_present' => (bool) $paymentRequestId,
                    'status' => $paymentStatus ?: null,
                ]);

                return response()->json(['status' => 'test_ok']);
            }

            $clientIpHash = hash('sha256', (string) $request->ip());
            Log::warning('Invalid Clip webhook signature', [
                'ip_hash' => $clientIpHash,
                'path' => $request->path(),
                'payload_keys' => array_keys($payload),
                'checkout_id_present' => (bool) $checkoutId,
                'payment_request_id_present' => (bool) $paymentRequestId,
                'status' => $paymentStatus ?: null,
                'signature_present' => (bool) $signature,
            ]);
            return response()->json(['status' => 'invalid_signature'], 401);
        }
        if (($checkoutId || $paymentRequestId) && in_array($paymentStatus, $paidStatuses, true)) {
            // Атомарное обновление для абсолютной защиты от Race Condition (Double-Spend)
            $updated = DB::table('payments')
                ->where(function ($query) use ($checkoutId, $paymentRequestId) {
                    if ($checkoutId) {
                        $query->where('clip_checkout_id', $checkoutId);
                    }

                    if ($paymentRequestId) {
                        $method = $checkoutId ? 'orWhere' : 'where';
                        $query->{$method}('clip_payment_request_id', $paymentRequestId);
                    }
                })
                ->where('status', '!=', 'paid')
                ->update([
                    'status' => 'paid',
                    'webhook_payload' => json_encode($payload),
                    'updated_at' => now(),
                ]);

            if ($updated) {
                $payment = DB::table('payments')
                    ->where(function ($query) use ($checkoutId, $paymentRequestId) {
                        if ($checkoutId) {
                            $query->where('clip_checkout_id', $checkoutId);
                        }

                        if ($paymentRequestId) {
                            $method = $checkoutId ? 'orWhere' : 'where';
                            $query->{$method}('clip_payment_request_id', $paymentRequestId);
                        }
                    })
                    ->first();
                if ($payment && $payment->user_id) {

                $this->activatePaidProduct($payment);

                // Бизнес-логика: Зачисление кредитов (если в описании есть слово «Crédito»)
                $desc = strtolower($payment->description);
                if ((str_contains($desc, 'crédito') || str_contains($desc, 'credito')) && $payment->amount >= 1) {
                    DB::table('users')->where('id', $payment->user_id)->increment('balance', $payment->amount);
                }
                
                $this->activateAdPromotion($payment);

                // Безопасная генерация Push-уведомления в реальном времени через WebSocket
                $notificationData = [
                    'user_id' => $payment->user_id,
                    'title' => '¡Pago exitoso!',
                    'message' => 'Tu pago de $' . number_format($payment->amount, 2) . ' MXN por "' . $payment->description . '" se procesó correctamente.',
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                $notifId = DB::table('user_notifications')->insertGetId($notificationData);
                $notificationData['id'] = $notifId;
                
                broadcast(new NewNotification((int) $payment->user_id, $notificationData));
                }
            }
        }

        return response()->json(['status' => 'received'], 200);
    }

    private function activatePaidProduct(object $payment): void
    {
        $planCode = $this->resolvePlanCode((string) $payment->description, (float) $payment->amount);
        if (!$planCode || !isset(self::SUBSCRIPTION_PLANS[$planCode])) {
            return;
        }

        $plan = self::SUBSCRIPTION_PLANS[$planCode];
        $updates = [
            'plan_code' => $planCode,
            'plan_name' => $plan['name'],
            'monthly_ad_limit' => $plan['limit'],
            'plan_activated_at' => now(),
            'plan_expires_at' => now()->addMonth(),
            'updated_at' => now(),
        ];

        if ($plan['business']) {
            $updates['role'] = 'business';
        }

        DB::table('users')->where('id', $payment->user_id)->update($updates);
    }

    private function activateAdPromotion(object $payment): void
    {
        if (! $payment->ad_id) {
            return;
        }

        $productCode = $payment->product_code ?: $this->resolvePromotionCode((string) $payment->description, (float) $payment->amount);
        $promotion = $this->promotionConfig($productCode);

        if (! $promotion) {
            return;
        }

        $expiresAt = now()->addDays($promotion['days']);

        DB::table('ads')->where('id', $payment->ad_id)->update([
            'promoted' => $promotion['promoted'],
            'boost_type' => $productCode,
            'boost_expires_at' => $expiresAt,
            'updated_at' => now(),
        ]);

        DB::table('ad_promotions')->updateOrInsert(
            ['ad_id' => $payment->ad_id],
            [
                'type' => $promotion['ledger_type'],
                'expires_at' => $expiresAt,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $this->forgetAdPromotionCaches();
    }

    private function promotionConfig(?string $productCode): ?array
    {
        return match ($productCode) {
            'boost_1_day' => ['promoted' => 'urgente', 'ledger_type' => 'lift', 'days' => 1],
            'boost_3_days' => ['promoted' => 'urgente', 'ledger_type' => 'lift', 'days' => 3],
            'highlight_7_days' => ['promoted' => 'highlight', 'ledger_type' => 'highlight', 'days' => 7],
            'featured_7_days' => ['promoted' => 'destacado', 'ledger_type' => 'vip', 'days' => 7],
            'featured_30_days' => ['promoted' => 'destacado', 'ledger_type' => 'vip', 'days' => 30],
            'top_category_7_days' => ['promoted' => 'destacado', 'ledger_type' => 'vip', 'days' => 7],
            default => null,
        };
    }

    private function resolvePromotionCode(string $description, float $amount): ?string
    {
        $desc = strtolower($description);

        return match (true) {
            str_contains($desc, 'subir 24') || $amount === 19.0 => 'boost_1_day',
            str_contains($desc, 'subir 3') || $amount === 49.0 => 'boost_3_days',
            str_contains($desc, 'resaltar') || $amount === 79.0 => 'highlight_7_days',
            str_contains($desc, '30') && (str_contains($desc, 'destacado') || $amount === 399.0) => 'featured_30_days',
            str_contains($desc, 'top categoría') || str_contains($desc, 'top categoria') => 'top_category_7_days',
            str_contains($desc, 'destacado') || str_contains($desc, 'promoción') || str_contains($desc, 'promocion') || $amount === 50.0 || $amount === 149.0 => 'featured_7_days',
            default => null,
        };
    }

    private function forgetAdPromotionCaches(): void
    {
        Cache::forget('ads_featured_block');
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');

        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }
    }

    private function resolvePlanCode(string $description, float $amount): ?string
    {
        $desc = strtolower($description);

        return match (true) {
            str_contains($desc, 'agencia') || $amount >= 1499 => 'package_agencia',
            str_contains($desc, 'ilimitado') => 'pro_unlimited_monthly',
            str_contains($desc, 'pro estándar') || str_contains($desc, 'pro estandar') => 'pro_standard_monthly',
            str_contains($desc, 'plan pro') || ($amount >= 599 && $amount < 1499) => 'package_pro',
            str_contains($desc, 'negocio') || ($amount >= 249 && $amount < 599) => 'package_negocio',
            str_contains($desc, 'impulso') || str_contains($desc, 'plus') || ($amount >= 99 && $amount < 249) => 'package_impulso',
            default => null,
        };
    }

    public function getCoupons(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        return response()->json(DB::table('coupons')->latest()->paginate(50));
    }

    public function createCoupon(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $request->validate([
            'code' => 'required|string|unique:coupons,code|max:50',
            'credits' => 'required|integer|min:1',
            'max_uses' => 'required|integer|min:1'
        ]);

        DB::table('coupons')->insert([
            'code' => strtoupper($request->code),
            'credits' => $request->credits,
            'max_uses' => $request->max_uses,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json(['success' => true]);
    }

    public function deleteCoupon(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        
        // Каскадное удаление связей (чтобы база не упала с ошибкой Foreign Key)
        DB::table('coupon_user')->where('coupon_id', $id)->delete();
        DB::table('coupons')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    public function redeemCoupon(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        $user = $request->user();
        
        // Предотвращение Race Condition (двойного зачисления) через транзакцию и блокировку
        return DB::transaction(function () use ($request, $user) {
            $coupon = DB::table('coupons')->where('code', strtoupper($request->code))->lockForUpdate()->first();

            if (!$coupon) return response()->json(['message' => 'Cupón no válido'], 400);
            
            // Защита от "Coupon Farming" (генерация бесконечных кредитов через пересоздание аккаунта)
            $fraudKey = 'coupon_claimed_' . $coupon->id . '_' . hash('sha256', (string) $request->ip());
            if (Cache::has($fraudKey)) {
                return response()->json(['message' => 'Este cupón ya fue canjeado desde esta red o dispositivo.'], 400);
            }
            
            if ($coupon->used_count >= $coupon->max_uses) return response()->json(['message' => 'Este cupón se ha agotado'], 400);
            
            $exists = DB::table('coupon_user')->where('user_id', $user->id)->where('coupon_id', $coupon->id)->lockForUpdate()->exists();
            if ($exists) {
                return response()->json(['message' => 'Ya has canjeado este cupón'], 400);
            }

            DB::table('coupon_user')->insert(['user_id' => $user->id, 'coupon_id' => $coupon->id, 'created_at' => now()]);
            DB::table('coupons')->where('id', $coupon->id)->increment('used_count');
            DB::table('users')->where('id', $user->id)->increment('balance', $coupon->credits);
            
            // Блокируем IP-адрес на год для данного купона
            Cache::put($fraudKey, true, now()->addDays(365));
            
            $newBalance = DB::table('users')->where('id', $user->id)->value('balance');
            return response()->json(['success' => true, 'message' => "¡Has recibido {$coupon->credits} créditos!", 'balance' => $newBalance]);
        });
    }

    /**
     * Получить историю платежей текущего пользователя
     */
    public function getUserPayments(Request $request)
    {
        $user = $request->user();
        $payments = DB::table('payments')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(15);
            
        return response()->json($payments);
    }

    /**
     * Получить историю всех платежей (только для админов)
     */
    public function getAdminPayments(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        
        $payments = DB::table('payments')
            ->join('users', 'payments.user_id', '=', 'users.id')
            ->select('payments.*', 'users.name as user_name', 'users.email as user_email')
            ->orderBy('payments.created_at', 'desc')
            ->paginate(50);
            
        return response()->json($payments);
    }
}
