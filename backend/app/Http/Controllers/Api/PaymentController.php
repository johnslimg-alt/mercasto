<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
            'ad_id' => 'nullable|integer',
        ]);

        $user = $request->user();
        $checkoutId = 'clip_' . Str::uuid();

        // Создаем запись о платеже в нашей базе данных со статусом 'pending'
        DB::table('payments')->insert([
            'user_id' => $user->id,
            'ad_id' => $request->ad_id,
            'clip_checkout_id' => $checkoutId,
            'amount' => $request->amount,
            'description' => $request->description,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Здесь будет реальный вызов Clip API (https://api.clip.mx/v2/checkouts)
        // $response = Http::withHeaders(['x-api-key' => env('CLIP_API_KEY')])->post('https://api.clip.mx/v2/checkouts', [
        //     'amount' => $request->amount * 100, // Clip ожидает сумму в центах
        //     'currency' => 'MXN',
        //     'description' => $request->description,
        //     'reference' => $checkoutId, // Наш уникальный ID для отслеживания
        //     'customer_id' => $user->id, // ID нашего пользователя
        // ]);
        // Реальный вызов API Clip
        $response = Http::withBasicAuth(env('CLIP_API_KEY'), env('CLIP_API_SECRET'))
            ->post('https://api.clip.mx/v2/checkouts', [
                'amount' => (float) $request->amount,
                'currency' => 'MXN',
                'purchase_description' => $request->description,
                'reference' => $checkoutId, // Наш уникальный ID для отслеживания веб-хука
                'redirection_url' => [
                    'success' => env('FRONTEND_URL', 'https://mercasto.com') . '/?payment=success',
                    'error'   => env('FRONTEND_URL', 'https://mercasto.com') . '/?payment=error',
                    'default' => env('FRONTEND_URL', 'https://mercasto.com')
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
        $secret = env('CLIP_WEBHOOK_SECRET');
        if (!$secret) {
            \Illuminate\Support\Facades\Log::error('CLIP_WEBHOOK_SECRET not configured — webhook rejected');
            return response()->json(['status' => 'misconfigured'], 503);
        }

        $signature = $request->header('X-Clip-Signature') ?? $request->header('X-Webhook-Signature');
        $expectedSignature = hash_hmac('sha256', $request->getContent(), $secret);
        $receivedHash = ltrim((string) $signature, 'sha256=');

        if (!$signature || !hash_equals($expectedSignature, $receivedHash)) {
            \Illuminate\Support\Facades\Log::warning('Invalid Clip webhook signature', [
                'ip' => $request->ip(),
                'signature' => $signature,
            ]);
            return response()->json(['status' => 'invalid_signature'], 401);
        }

        $payload = $request->all();
        $checkoutId = $payload['reference'] ?? null; // Получаем наш ID из веб-хука

        if ($checkoutId && isset($payload['status']) && $payload['status'] === 'paid') {
            // Обновляем статус платежа в нашей базе
            DB::table('payments')->where('clip_checkout_id', $checkoutId)->update([
                'status' => 'paid',
                'webhook_payload' => json_encode($payload),
                'updated_at' => now(),
            ]);

            // Бизнес-логика: Выдаем PRO статус (роль 'business'), если оплачен тариф «PRO» или «Plus»
            $payment = DB::table('payments')->where('clip_checkout_id', $checkoutId)->first();
            if ($payment && $payment->user_id) {
                $desc = strtolower($payment->description);
                if (str_contains($desc, 'pro') || str_contains($desc, 'plus')) {
                    DB::table('users')->where('id', $payment->user_id)->update(['role' => 'business']);
                }

                // Бизнес-логика: Зачисление кредитов (если в описании есть слово «Crédito»)
                if (str_contains($desc, 'crédito') || str_contains($desc, 'credito')) {
                    DB::table('users')->where('id', $payment->user_id)->increment('balance', $payment->amount);
                }
                
                // Бизнес-логика: Если платеж привязан к объявлению, продвигаем его
                if ($payment->ad_id) {
                    DB::table('ads')->where('id', $payment->ad_id)->update(['promoted' => 'destacado']);
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
        return response()->json(DB::table('coupons')->latest()->get());
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
        DB::table('coupons')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    public function redeemCoupon(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        $user = $request->user();
        $coupon = DB::table('coupons')->where('code', strtoupper($request->code))->first();

        if (!$coupon) return response()->json(['message' => 'Cupón no válido'], 400);
        if ($coupon->used_count >= $coupon->max_uses) return response()->json(['message' => 'Este cupón se ha agotado'], 400);
        if (DB::table('coupon_user')->where('user_id', $user->id)->where('coupon_id', $coupon->id)->exists()) {
            return response()->json(['message' => 'Ya has canjeado este cupón'], 400);
        }

        DB::table('coupon_user')->insert(['user_id' => $user->id, 'coupon_id' => $coupon->id, 'created_at' => now()]);
        DB::table('coupons')->where('id', $coupon->id)->increment('used_count');
        DB::table('users')->where('id', $user->id)->increment('balance', $coupon->credits);
        return response()->json(['success' => true, 'message' => "¡Has recibido {$coupon->credits} créditos!", 'balance' => $user->balance + $coupon->credits]);
    }
}