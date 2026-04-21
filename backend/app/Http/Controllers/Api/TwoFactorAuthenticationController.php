<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorAuthenticationController extends Controller
{
    /**
     * Включение двухфакторной аутентификации для пользователя.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Защита от перехвата аккаунта (2FA Overwrite): блокируем генерацию, если 2FA уже включена
        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            return response()->json(['message' => 'La autenticación de dos factores ya está activada.'], 400);
        }

        $google2fa = new Google2FA();

        $secretKey = $google2fa->generateSecretKey();

        $user->forceFill([
            'two_factor_secret' => $secretKey,
            'two_factor_recovery_codes' => json_encode(Collection::times(8, function () {
                return Str::random(10) . '-' . Str::random(10);
            })->all()),
        ])->save();

        // Защита (Session Hijacking): отзываем все остальные сессии при включении 2FA, 
        // чтобы выкинуть потенциальных взломщиков, оставив только текущее устройство
        $currentToken = $request->user()->currentAccessToken();
        if ($currentToken) {
            $user->tokens()->where('id', '!=', $currentToken->id)->delete();
        }

        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $user->two_factor_secret
        );

        // Для генерации QR-кода на фронтенде можно использовать 'pragmarx/google2fa-qrcode' или любую JS-библиотеку
        // Здесь мы просто вернем URL для QR-кода
        return response()->json([
            'qr_code_url' => $qrCodeUrl, // Или можно сгенерировать SVG и вернуть его
            'recovery_codes' => json_decode($user->two_factor_recovery_codes),
        ]);
    }

    /**
     * Подтверждение и активация 2FA.
     */
    public function confirm(Request $request)
    {
        $request->validate(['code' => 'required|string']);
        $user = $request->user();
        $google2fa = new Google2FA();

        if ($google2fa->verifyKey($user->two_factor_secret, $request->code)) {
            $user->forceFill([
                'two_factor_confirmed_at' => now(),
            ])->save();

            return response()->json(['message' => 'Two-factor authentication confirmed and enabled.']);
        }

        return response()->json(['message' => 'Invalid 2FA code.'], 422);
    }

    /**
     * Отключение двухфакторной аутентификации.
     */
    public function destroy(Request $request)
    {
        $user = $request->user();

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json(['message' => 'Two-factor authentication has been disabled.']);
    }
}
