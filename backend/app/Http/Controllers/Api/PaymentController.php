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
    /**
     * Создание сессии оплаты через Clip Mexico
     */
    public function createClipCheckout(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1',
            'description' => 'required|string|max:255',
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
        $packages = [
            'Suscripción Paquete Plus' => 99,
            'Suscripción PRO Estándar' => 500,
            'Suscripción PRO Ilimitado' => 1500,
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
            if ($ad->promoted === 'destacado') {
                return response()->json(['message' => 'Este anuncio ya está destacado.'], 400);
            }

            $amount = 50; // Жесткая цена за продвижение
            $description = "Promoción de anuncio #" . $request->ad_id;
        } elseif (array_key_exists($description, $packages)) {
            $amount = (float) $packages[$description];
        } else {
            return response()->json(['message' => 'Servicio no válido'], 400);
        }

        // Защита от DB Bloat DoS: переиспользуем 'pending' сессии
        $existing = DB::table('payments')->where(['user_id' => $user->id, 'ad_id' => $request->ad_id, 'description' => $description, 'status' => 'pending'])->first();
        if ($existing) {
            DB::table('payments')->where('id', $existing->id)->update(['clip_checkout_id' => $checkoutId, 'amount' => $amount, 'updated_at' => now()]);
        } else {
            DB::table('payments')->insert([
                'user_id' => $user->id, 'ad_id' => $request->ad_id, 'clip_checkout_id' => $checkoutId, 
                'amount' => $amount, 'description' => $description, 'status' => 'pending', 
                'created_at' => now(), 'updated_at' => now()
            ]);
        }

        $response = Http::withBasicAuth(config('services.clip.api_key'), config('services.clip.api_secret'))
            ->post('https://api.clip.mx/v2/checkouts', [
                'amount' => $amount,
                'currency' => 'MXN',
                'purchase_description' => $description,
                'reference' => $checkoutId, // Наш уникальный ID для отслеживания веб-хука
                'redirection_url' => [
                    'success' => config('app.frontend_url', 'https://mercasto.com') . '/?payment=success',
                    'error'   => config('app.frontend_url', 'https://mercasto.com') . '/?payment=error',
                    'default' => config('app.frontend_url', 'https://mercasto.com')
                ],
                'override_color' => '#84CC16' // Фирменный цвет кнопок Mercasto
            ]);

        if ($response->successful()) {
            return response()->json([
                'success' => true,
                'message' => 'Checkout generado',
                'payment_url' => $response->json('payment_url') // Реальная ссылка на форму оплаты Clip
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Error al generar el pago con Clip',
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

        $signature = $request->header('X-Clip-Signature') ?? $request->header('X-Webhook-Signature');
        $expectedSignature = hash_hmac('sha256', $request->getContent(), $secret);
        // Защита от криптографического бага ltrim (удалял нужные символы хэша, если они совпадали с маской)
        $receivedHash = str_starts_with((string) $signature, 'sha256=') ? substr((string) $signature, 7) : (string) $signature;

        if (!$signature || !hash_equals($expectedSignature, $receivedHash)) {
            $clientIpHash = hash('sha256', (string) $request->ip());
            Log::warning('Invalid Clip webhook signature', [
                'ip_hash' => $clientIpHash,
            ]);
            return response()->json(['status' => 'invalid_signature'], 401);
        }

        $payload = $request->all();
        $checkoutId = $payload['reference'] ?? null; // Получаем наш ID из веб-хука

        if ($checkoutId && isset($payload['status']) && $payload['status'] === 'paid') {
            // Атомарное обновление для абсолютной защиты от Race Condition (Double-Spend)
            $updated = DB::table('payments')
                ->where('clip_checkout_id', $checkoutId)
                ->where('status', '!=', 'paid')
                ->update([
                    'status' => 'paid',
                    'webhook_payload' => json_encode($payload),
                    'updated_at' => now(),
                ]);

            if ($updated) {
                $payment = DB::table('payments')->where('clip_checkout_id', $checkoutId)->first();
                if ($payment && $payment->user_id) {

                // Бизнес-логика: Выдаем PRO статус (роль 'business'), если оплачен тариф «PRO» или «Plus»
                $desc = strtolower($payment->description);
                if ((str_contains($desc, 'pro') || str_contains($desc, 'plus')) && $payment->amount >= 99) {
                    DB::table('users')->where('id', $payment->user_id)->update(['role' => 'business']);
                }

                // Бизнес-логика: Зачисление кредитов (если в описании есть слово «Crédito»)
                if ((str_contains($desc, 'crédito') || str_contains($desc, 'credito')) && $payment->amount >= 1) {
                    DB::table('users')->where('id', $payment->user_id)->increment('balance', $payment->amount);
                }
                
                // Бизнес-логика: Если платеж привязан к объявлению, продвигаем его
                if ($payment->ad_id) {
                    DB::table('ads')->where('id', $payment->ad_id)->update(['promoted' => 'destacado']);
                    
                    // Финансовый Аудит: Логируем оказанную услугу и устанавливаем срок сгорания VIP-статуса (7 дней)
                    DB::table('ad_promotions')->insert([
                        'ad_id' => $payment->ad_id,
                        'type' => 'vip',
                        'expires_at' => now()->addDays(7),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }

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
                
                broadcast(new NewNotification($notificationData));
                }
            }
        }

        return response()->json(['status' => 'received'], 200);
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
}
