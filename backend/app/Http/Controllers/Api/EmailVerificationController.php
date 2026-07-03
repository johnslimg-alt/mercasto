<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\EmailVerifyMail;
use App\Support\MailLocale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class EmailVerificationController extends Controller
{
    /**
     * POST /api/email/send-verification  (auth, throttle:3,60)
     * Sends or resends the verification email for the authenticated user.
     */
    public function send(Request $request)
    {
        $user = $request->user();

        if ($user->email_verified_at) {
            return response()->json(['message' => 'El correo ya está verificado.'], 200);
        }

        try {
            $token = bin2hex(random_bytes(32));

            DB::table('users')
                ->where('id', $user->id)
                ->update(['email_verification_token' => $token]);

            $baseUrl = rtrim(config('app.url', 'https://mercasto.com'), '/');
            $verificationUrl = $baseUrl . '/verificar-email'
                . '?token=' . $token
                . '&email=' . urlencode($user->email);

            Mail::to($user->email)->send(new EmailVerifyMail(
                $user->name,
                $verificationUrl,
                MailLocale::resolve($request, $user),
            ));
        } catch (\Throwable $e) {
            Log::warning('Could not send verification email: ' . $e->getMessage());
            return response()->json(['message' => 'No pudimos enviar el correo de verificación. Inténtalo de nuevo.'], 503);
        }

        return response()->json(['ok' => true, 'message' => 'Email de verificación enviado.']);
    }

    /**
     * POST /api/email/verify  (public)
     * Verifies the token and marks the user's email as verified.
     */
    public function verify(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
        ]);

        $user = DB::table('users')
            ->where('email', $data['email'])
            ->where('email_verification_token', $data['token'])
            ->whereNull('email_verified_at')
            ->first();

        if (!$user) {
            return response()->json(['error' => 'Token inválido o expirado.'], 422);
        }

        DB::table('users')->where('id', $user->id)->update([
            'email_verified_at'          => now(),
            'email_verification_token'   => null,
        ]);

        return response()->json([
            'ok'      => true,
            'message' => '¡Email verificado correctamente!',
        ]);
    }
}
