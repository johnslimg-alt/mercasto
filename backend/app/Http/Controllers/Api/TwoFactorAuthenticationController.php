<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorAuthenticationController extends Controller
{
    /**
     * Включение двухфакторной аутентификации для пользователя.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            return response()->json(['message' => 'La autenticación de dos factores ya está activada.'], 400);
        }

        $google2fa = new Google2FA();
        $secretKey = $google2fa->generateSecretKey();

        $user->forceFill([
            'two_factor_secret' => $secretKey,
            'two_factor_recovery_codes' => json_encode(Collection::times(8, function () {
                return Str::random(10).'-'.Str::random(10);
            })->all()),
        ])->save();

        $this->revokeOtherTokens($request);

        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $user->two_factor_secret,
        );

        return response()->json([
            'qr_code_url' => $qrCodeUrl,
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
     * Отключение двухфакторной аутентификации после повторного подтверждения личности.
     */
    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'password' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:64',
        ]);
        $user = $request->user();

        if (! $user->two_factor_secret || ! $user->two_factor_confirmed_at) {
            return response()->json(['message' => 'La autenticación de dos factores no está activada.'], 422);
        }

        $password = (string) ($validated['password'] ?? '');
        $code = (string) ($validated['code'] ?? '');
        if ($password === '' && $code === '') {
            throw ValidationException::withMessages([
                'reauthentication' => ['Confirma tu contraseña o un código 2FA antes de desactivar la protección.'],
            ]);
        }

        $verified = $password !== '' && Hash::check($password, (string) $user->password);
        $recoveryCodes = json_decode((string) $user->two_factor_recovery_codes, true) ?? [];

        if (! $verified && $code !== '') {
            $google2fa = new Google2FA();
            $verified = $google2fa->verifyKey((string) $user->two_factor_secret, $code);

            if (! $verified) {
                foreach ($recoveryCodes as $recoveryCode) {
                    if (is_string($recoveryCode) && hash_equals($recoveryCode, $code)) {
                        $verified = true;
                        break;
                    }
                }
            }
        }

        if (! $verified) {
            throw ValidationException::withMessages([
                'reauthentication' => ['La contraseña o el código de autenticación es incorrecto.'],
            ]);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        // A sensitive security downgrade invalidates every other persisted session.
        $this->revokeOtherTokens($request);

        return response()->json(['message' => 'Two-factor authentication has been disabled.']);
    }

    private function revokeOtherTokens(Request $request): void
    {
        $user = $request->user();
        $currentToken = $user->currentAccessToken();
        $currentTokenId = is_object($currentToken) && isset($currentToken->id)
            ? (int) $currentToken->id
            : null;

        if ($currentTokenId) {
            $user->tokens()->where('id', '!=', $currentTokenId)->delete();
        }
    }
}
