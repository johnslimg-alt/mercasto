<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SecureOneTimeCode;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PhoneVerificationController extends Controller
{
    private const OTP_PURPOSE = 'profile-phone-verification';

    public function sendOtp(Request $request)
    {
        $request->validate(['phone' => 'required|string|min:10|max:20']);

        $user = auth()->user();
        $phone = preg_replace('/[^0-9+]/', '', $request->phone);
        $twilioSid = config('services.twilio.sid');
        $twilioToken = config('services.twilio.token');
        $twilioFrom = config('services.twilio.from');

        if (! $twilioSid || ! $twilioToken || ! $twilioFrom) {
            Log::warning('Phone verification SMS provider is not configured', [
                'user_id' => $user->id,
                'phone_hash' => hash('sha256', $phone),
            ]);

            return response()->json(['error' => 'La verificación por SMS no está disponible en este momento.'], 503);
        }

        $rateKey = SecureOneTimeCode::cacheKey('profile-phone-rate', $phone);
        if (Cache::get($rateKey, 0) >= 3) {
            return response()->json(['error' => 'Demasiados intentos. Espera una hora.'], 429);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes(10);

        try {
            $client = new \Twilio\Rest\Client($twilioSid, $twilioToken);
            $client->messages->create($phone, [
                'from' => $twilioFrom,
                'body' => "Tu código de verificación de Mercasto es: {$otp}. Válido por 10 minutos.",
            ]);
        } catch (\Throwable $e) {
            Log::error('Phone verification SMS delivery failed', [
                'user_id' => $user->id,
                'phone_hash' => hash('sha256', $phone),
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'No pudimos enviar el SMS. Intenta de nuevo más tarde.'], 503);
        }

        DB::table('users')->where('id', $user->id)->update([
            'phone_number' => $phone,
            'phone_verified' => false,
            'phone_otp' => null,
            'phone_otp_hash' => SecureOneTimeCode::hash($otp, self::OTP_PURPOSE),
            'phone_otp_expires_at' => $expiresAt,
        ]);
        $user->refresh();
        Cache::put($rateKey, Cache::get($rateKey, 0) + 1, 3600);

        return response()->json(['ok' => true, 'expires_in' => 600]);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate(['otp' => 'required|string|size:6']);
        $user = auth()->user();
        $dbUser = DB::table('users')->where('id', $user->id)->first();

        if (! isset($dbUser->phone_otp_hash) || ! $dbUser->phone_otp_hash || ! isset($dbUser->phone_otp_expires_at) || ! $dbUser->phone_otp_expires_at) {
            return response()->json(['error' => 'No hay código pendiente. Solicita uno nuevo.'], 422);
        }

        if (now()->isAfter($dbUser->phone_otp_expires_at)) {
            return response()->json(['error' => 'El código ha expirado. Solicita uno nuevo.'], 422);
        }

        if (! SecureOneTimeCode::verify((string) $request->otp, $dbUser->phone_otp_hash, self::OTP_PURPOSE)) {
            return response()->json(['error' => 'Código incorrecto.'], 422);
        }

        DB::table('users')->where('id', $user->id)->update([
            'phone_verified' => true,
            'phone_otp' => null,
            'phone_otp_hash' => null,
            'phone_otp_expires_at' => null,
        ]);
        $user->refresh();

        try {
            if (($dbUser->verification_level ?? 'none') === 'none') {
                DB::table('users')->where('id', $user->id)->update(['verification_level' => 'phone']);
            }
        } catch (\Exception $e) {
            Log::warning('Could not upgrade verification_level: '.$e->getMessage());
        }

        Cache::forget("public_profile_{$user->id}");

        return response()->json(['ok' => true, 'message' => 'Teléfono verificado correctamente!']);
    }
}
