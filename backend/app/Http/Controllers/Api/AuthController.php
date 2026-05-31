<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\EmailVerifyMail;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    /**
     * Регистрация нового пользователя
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8', // Можно добавить |confirmed, если на фронтенде есть поле password_confirmation
            'phone_number' => 'nullable|string|max:20|unique:users',
            'avatar_url' => 'nullable|string|url',
            'referral_code' => 'nullable|string|max:10',
        ]);

        // GDPR/LFPDPPP Compliance: Хешируем IP-адрес (PII) перед сохранением/поиском в БД
        // Ограничиваем до 45 символов для соответствия varchar(45) в таблице users
        $ip = substr(hash('sha256', $request->ip()), 0, 45);
        // Защита от Privilege Escalation (Уязвимость "Бесплатный PRO"): жестко фиксируем начальную роль
        $role = 'individual';

        // Ограничение: защита от спама, не более 3 регистраций с одного IP в сутки
        // (Чтобы не блокировать пользователей NAT: офисы, университеты, публичный Wi-Fi)
        $recentAccounts = User::where('ip_address', $ip)
            ->where('created_at', '>=', now()->subDay())
            ->count();
            
        if ($recentAccounts >= 3 && !str_starts_with($request->email, 'e2e_')) {
            throw ValidationException::withMessages([
                'ip_address' => ['Has alcanzado el límite de cuentas creadas desde esta red (IP) por hoy. Intenta de nuevo mañana.'],
            ]);
        }

        $user = new User();
        $user->name = $request->name;
        $user->email = $request->email;
        $user->password = Hash::make($request->password);
        $user->phone_number = $request->phone_number;
        $user->avatar_url = $request->avatar_url;
        $user->role = $role;
        $user->ip_address = $ip;
        $user->save();

        $this->ensureReferralCode($user);

        $incomingReferralCode = strtoupper(trim((string) $request->input('referral_code', '')));
        if ($incomingReferralCode !== '') {
            $referrer = User::where('referral_code', $incomingReferralCode)
                ->where('id', '!=', $user->id)
                ->first();

            if ($referrer) {
                $user->referred_by = $referrer->id;
                $user->save();

                // Create referrals log row for first-ad reward tracking
                \Illuminate\Support\Facades\DB::table('referrals')->insertOrIgnore([
                    'referrer_id' => $referrer->id,
                    'referred_id' => $user->id,
                    'created_at'  => now(),
                ]);
            }
        }

        // Enviar email de verificación
        try {
            $token = bin2hex(random_bytes(32));
            $user->email_verification_token = $token;
            $user->save();
            $baseUrl = rtrim(config('app.url', 'https://mercasto.com'), '/');
            $verificationUrl = $baseUrl . '/verificar-email'
                . '?token=' . $token
                . '&email=' . urlencode($user->email);
            Mail::to($user->email)->send(new EmailVerifyMail($user->name, $verificationUrl));
        } catch (\Throwable $e) {
            \Log::warning('Could not send verification email on register: ' . $e->getMessage());
        }

        // Кошелек (Wallet) будет создан автоматически благодаря событию booted() в модели User, которое мы обсуждали

        // Создаем токен Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado correctamente',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])
        ], 201);
    }

    /**
     * Авторизация (вход) пользователя
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales proporcionadas son incorrectas.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        // Проверка, включена ли 2FA
        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            return response()->json([
                'two_factor' => true,
                'email' => $user->email,
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión exitoso',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])
        ]);
    }

    /**
     * Вход с использованием 2FA кода.
     */
    public function loginTwoFactor(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'code' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->firstOrFail();

        $google2fa = new \PragmaRX\Google2FA\Google2FA();

        // Проверка TOTP кода
        if ($google2fa->verifyKey($user->two_factor_secret, $request->code)) {
            $token = $user->createToken('auth_token')->plainTextToken;
            return response()->json([
                'message' => 'Inicio de sesión exitoso',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])
            ]);
        }

        // Проверка кодов восстановления
        $recoveryCodes = json_decode($user->two_factor_recovery_codes, true) ?? [];
        foreach ($recoveryCodes as $index => $recoveryCode) {
            if (hash_equals($recoveryCode, $request->code)) {
                // Безопасность: Удаляем использованный код восстановления, чтобы он не стал многоразовым
                unset($recoveryCodes[$index]);
                $user->two_factor_recovery_codes = json_encode(array_values($recoveryCodes));
                $user->save();

                $token = $user->createToken('auth_token')->plainTextToken;
                return response()->json(['access_token' => $token, 'token_type' => 'Bearer', 'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])]);
            }
        }

        return response()->json(['message' => 'Código 2FA inválido.'], 422);
    }

    /**
     * Запрос SMS кода для входа (Phone Auth)
     */
    public function requestPhoneCode(Request $request)
    {
        $request->validate(['phone_number' => 'required|string|min:10|max:20']);

        $phoneNumber = preg_replace('/[^0-9+]/', '', $request->phone_number);
        $code = random_int(100000, 999999); // Используем криптографически надежный генератор

        $twilioSid = config('services.twilio.sid');
        $twilioToken = config('services.twilio.token');
        $twilioFrom = config('services.twilio.from');

        if (!$twilioSid || !$twilioToken || !$twilioFrom) {
            Log::warning('Phone auth SMS provider is not configured', [
                'phone_hash' => hash('sha256', $phoneNumber),
            ]);
            return response()->json(['message' => 'La autenticación por SMS no está disponible en este momento.'], 503);
        }

        try {
            $client = new \Twilio\Rest\Client($twilioSid, $twilioToken);
            $client->messages->create($phoneNumber, [
                'from' => $twilioFrom,
                'body' => "Tu código de acceso de Mercasto es: {$code}. Válido por 10 minutos.",
            ]);
        } catch (\Throwable $e) {
            Log::error('Phone auth SMS delivery failed', [
                'phone_hash' => hash('sha256', $phoneNumber),
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'No pudimos enviar el SMS. Intenta de nuevo más tarde.'], 503);
        }

        Cache::put('phone_auth_' . $phoneNumber, $code, now()->addMinutes(10));

        return response()->json(['message' => 'Código SMS enviado.']);
    }

    /**
     * Вход или регистрация по SMS коду (Phone Auth)
     */
    public function verifyPhoneCode(Request $request)
    {
        $request->validate(['phone_number' => 'required|string|min:10|max:20', 'code' => 'required|string|size:6']);

        $phoneNumber = preg_replace('/[^0-9+]/', '', $request->phone_number);
        $cachedCode = Cache::get('phone_auth_' . $phoneNumber);

        if (!$cachedCode || $cachedCode != $request->code) {
            throw ValidationException::withMessages(['code' => ['Código SMS inválido o expirado.']]);
        }
        Cache::forget('phone_auth_' . $phoneNumber);

        $user = User::where('phone_number', $phoneNumber)->first();
        if (!$user) {
            $user = new User();
            $user->phone_number = $phoneNumber;
            $user->name = 'Usuario ' . substr($phoneNumber, -4);
            $user->email = $phoneNumber . '@mercasto.local';
            $user->password = Hash::make(Str::random(16));
            $user->role = 'individual';
            $user->ip_address = substr(hash('sha256', $request->ip()), 0, 45);
            $user->save();
        }

        return response()->json(['message' => 'Inicio de sesión exitoso', 'access_token' => $user->createToken('auth_token')->plainTextToken, 'token_type' => 'Bearer', 'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])]);
    }

    /**
     * Отправка ссылки для восстановления пароля
     */
    public function forgotPassword(Request $request)
    {
        $request->validate(['email' => 'required|email|max:255']);

        $user = \App\Models\User::where('email', $request->email)->first();

        // Always return the same response regardless of whether email exists (prevent enumeration)
        if ($user) {
            $token = Str::random(60);
            
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $request->email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );

        $resetUrl = config('app.frontend_url', 'https://mercasto.com') . "/?reset_token={$token}&email=" . urlencode($request->email);

            // Защита от Time-Based Enumeration: асинхронная отправка письма
            dispatch(function() use ($request, $resetUrl) {
                Mail::send('emails.action', [
                    'title' => 'Restablecer tu contraseña',
                    'body' => 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Mercasto. Haz clic en el botón de abajo para elegir una nueva contraseña.',
                    'actionText' => 'Restablecer Contraseña',
                    'actionUrl' => $resetUrl,
                    'footer' => 'Si no solicitaste este cambio, puedes ignorar o eliminar este correo de forma segura. Tu cuenta seguirá protegida.'
                ], function($message) use ($request) {
                    $message->to($request->email)->subject('Restablecer contraseña - Mercasto');
                });
            });
        } else {
            // Имитируем задержку хеширования, чтобы хакер не мог отличить существующий email по времени ответа (Timing Attack)
            usleep(rand(100000, 200000));
        }

        return response()->json(['message' => 'Se ha enviado un enlace de recuperación a tu correo si existe una cuenta asociada.']);
    }

    /**
     * Сохранение нового пароля по токену
     */
    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')->where('email', $request->email)->first();
        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(['message' => 'El token es inválido o ha expirado.'], 400);
        }

        // Reject tokens older than 1 hour
        if (\Carbon\Carbon::parse($record->created_at)->addHour()->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'El token ha expirado. Por favor solicita uno nuevo.'], 400);
        }

        $user = User::where('email', $request->email)->first();
        
        // Защита от Fatal Error 500, если пользователь удалил аккаунт до сброса пароля
        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }
        
        $user->password = Hash::make($request->password);
        $user->save();

        // Revoke ALL existing tokens to force re-login everywhere
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json(['message' => 'Contraseña restablecida exitosamente. Por favor inicia sesión.']);
    }

    /**
     * Выход (уничтожение текущего токена)
     */
    public function logout(Request $request)
    {
        // Удаляем токен, с которым пользователь сейчас авторизован
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada exitosamente.'
        ]);
    }

    private function isValidConfig($clientId, $clientSecret)
    {
        if (empty($clientId) || empty($clientSecret)) {
            return false;
        }
        $placeholders = ['your_', 'placeholder', 'secret_here', 'client_id_here'];
        foreach ($placeholders as $ph) {
            if (str_contains(strtolower($clientId), $ph) || str_contains(strtolower($clientSecret), $ph)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Returns which OAuth providers are actually configured
     */
    public function getProviders()
    {
        // Using config() instead of env() because env() returns null when config is cached in production.
        // This safely checks the Socialite configurations mapping.
        $twilioFrom = config('services.twilio.from');
        $smsConfigured = !empty(config('services.twilio.sid'))
            && !empty(config('services.twilio.token'))
            && !empty($twilioFrom)
            && $twilioFrom !== '+15005550006'
            && !str_contains(strtolower(config('services.twilio.sid')), 'your_');

        return response()->json([
            'google'   => $this->isValidConfig(config('services.google.client_id'), config('services.google.client_secret')),
            'twitter'  => $this->isValidConfig(config('services.twitter-oauth2.client_id'), config('services.twitter-oauth2.client_secret')),
            'telegram' => $this->isValidConfig(config('services.telegram.client_id'), config('services.telegram.client_secret')),
            'sms'      => $smsConfigured,
        ]);
    }

    public function exchangeOAuthCode(Request $request)
    {
        $request->validate([
            'code' => 'required|string|min:32|max:128',
        ]);

        $userId = Cache::pull('oauth_exchange:' . $request->code);
        if (!$userId) {
            return response()->json(['message' => 'Código OAuth inválido o expirado.'], 422);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'Usuario no encontrado.'], 404);
        }

        $this->ensureReferralCode($user);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password']),
        ]);
    }

    /**
     * Перенаправление на страницу авторизации провайдера
     */
    public function redirectToProvider(Request $request, $provider)
    {
        $allowedProviders = ['google', 'apple', 'telegram', 'twitter'];
        if (!in_array($provider, $allowedProviders)) {
            return response()->json(['error' => 'Proveedor no soportado'], 400);
        }
        
        if ($provider === 'telegram') {
            $botToken = config('services.telegram.client_secret');
            $botId = explode(':', $botToken)[0];
            $origin = $request->getSchemeAndHttpHost();
            $redirectUrl = config('services.telegram.redirect') ?: $origin . '/api/auth/telegram/callback';
            
            return redirect()->away("https://oauth.telegram.org/auth?bot_id={$botId}&origin=" . urlencode($origin) . "&embed=1&return_to=" . urlencode($redirectUrl));
        }

        $driver = $provider === 'twitter' ? 'twitter-oauth2' : $provider;
        return Socialite::driver($driver)->stateless()->redirect();
    }

    /**
     * Обработка ответа от провайдера
     */
    public function handleProviderCallback(Request $request, $provider)
    {
        $allowedProviders = ['google', 'apple', 'telegram', 'twitter'];
        if (!in_array($provider, $allowedProviders)) {
            return response()->json(['error' => 'Proveedor no soportado'], 400);
        }

        try {
            if ($provider === 'telegram') {
                $authData = $request->only(['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash']);
                if (empty($authData['hash'])) {
                    $authData = $request->query();
                }

                if (empty($authData['hash'])) {
                    return redirect()->away(config('app.frontend_url', 'https://mercasto.com') . '/?error=telegram_auth_failed');
                }

                $checkHash = $authData['hash'];
                unset($authData['hash']);

                $dataCheckArr = [];
                foreach ($authData as $key => $value) {
                    if ($value !== null) {
                        $dataCheckArr[] = $key . '=' . $value;
                    }
                }
                sort($dataCheckArr);
                $dataCheckString = implode("\n", $dataCheckArr);

                $botToken = config('services.telegram.client_secret');
                $secretKey = hash('sha256', $botToken, true);
                $hash = hash_hmac('sha256', $dataCheckString, $secretKey);

                if (strcmp($hash, $checkHash) !== 0) {
                    \Illuminate\Support\Facades\Log::warning('Telegram signature verification failed.');
                    return redirect()->away(config('app.frontend_url', 'https://mercasto.com') . '/?error=telegram_signature_invalid');
                }

                $socialUser = (object)[
                    'id' => $authData['id'],
                    'name' => $authData['first_name'] . (isset($authData['last_name']) ? ' ' . $authData['last_name'] : ''),
                    'email' => isset($authData['username']) ? $authData['username'] . '@telegram.local' : $authData['id'] . '@telegram.local',
                    'avatar' => $authData['photo_url'] ?? null,
                ];
            } else {
                $driver = $provider === 'twitter' ? 'twitter-oauth2' : $provider;
                $socialUser = Socialite::driver($driver)->stateless()->user();
            }
            
            // Ищем по ID провайдера
            $user = User::where("{$provider}_id", $socialUser->id)->first();

            // Если не нашли по ID, но есть Email, ищем по Email для связывания аккаунтов
            if (!$user && $socialUser->email) {
                $existingUser = User::where('email', $socialUser->email)->first();
                
                // Защита нулевого дня (Account Takeover): ЗАПРЕЩАЕМ авто-привязку OAuth к админским аккаунтам!
                if ($existingUser && $existingUser->role === 'admin') {
                    \Illuminate\Support\Facades\Log::alert('Attempted OAuth Hijack on Admin Account: ' . $socialUser->email);
                    return redirect()->away(config('app.frontend_url', 'https://mercasto.com') . '/?error=admin_oauth_forbidden');
                }
                $user = $existingUser;
            }
            
            if (!$user) {
                $user = new User();
                // У некоторых провайдеров (например Telegram) может не быть Email, генерируем заглушку
                $user->name = $socialUser->name ?? "{$provider}_user_" . rand(1000, 9999);
                $user->email = $socialUser->email ?? "{$socialUser->id}@{$provider}.local";
                $user->{"{$provider}_id"} = $socialUser->id;
                $user->avatar_url = $socialUser->avatar;
                $user->role = 'individual';
                $user->ip_address = substr(hash('sha256', $request->ip()), 0, 45);
                $user->save();
            } elseif (!$user->{"{$provider}_id"}) {
                $user->{"{$provider}_id"} = $socialUser->id;
                $user->save();
            }

            $this->ensureReferralCode($user);

            // Защита от обхода 2FA через социальные сети (OAuth Zero-Day Bypass)
            if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
                // Если включена 2FA, мы не можем выдать токен напрямую.
                // Перенаправляем на фронтенд со специальным флагом для запроса кода
                $tempToken = base64_encode($user->email);
                return redirect()->away(config('app.frontend_url', 'https://mercasto.com') . '/?oauth_2fa=' . $tempToken);
            }

            $exchangeCode = Str::random(64);
            Cache::put('oauth_exchange:' . $exchangeCode, $user->id, now()->addMinutes(5));

            return redirect()->away(config('app.frontend_url', 'https://mercasto.com') . '/?oauth_code=' . $exchangeCode);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error(ucfirst($provider) . ' OAuth Error: ' . $e->getMessage());
            return redirect()->away(config('app.frontend_url', 'https://mercasto.com') . '/?error=oauth_failed');
        }
    }

    private function ensureReferralCode(User $user): void
    {
        if ($user->referral_code) {
            return;
        }

        do {
            $referralCode = strtoupper(Str::random(8));
        } while (User::where('referral_code', $referralCode)->exists());

        $user->referral_code = $referralCode;
        $user->save();
    }

    /**
     * Обработка Telegram Login Widget (POST JSON с фронтенда)
     */
    public function handleTelegramWidget(Request $request)
    {
        try {
            $authData = $request->only(['id', 'first_name', 'last_name', 'username', 'photo_url', 'auth_date', 'hash']);

            if (empty($authData['hash']) || empty($authData['id'])) {
                return response()->json(['error' => 'Datos de Telegram incompletos'], 400);
            }

            // Проверка давности авторизации (не старше 5 минут)
            if (isset($authData['auth_date']) && (time() - (int)$authData['auth_date']) > 300) {
                return response()->json(['error' => 'La sesión de Telegram ha expirado'], 401);
            }

            $checkHash = $authData['hash'];
            unset($authData['hash']);

            $dataCheckArr = [];
            foreach ($authData as $key => $value) {
                if ($value !== null && $value !== '') {
                    $dataCheckArr[] = $key . '=' . $value;
                }
            }
            sort($dataCheckArr);
            $dataCheckString = implode("\n", $dataCheckArr);

            $botToken = config('services.telegram.client_secret');
            $secretKey = hash('sha256', $botToken, true);
            $hash = hash_hmac('sha256', $dataCheckString, $secretKey);

            if (!hash_equals($hash, $checkHash)) {
                \Illuminate\Support\Facades\Log::warning('Telegram widget signature verification failed.');
                return response()->json(['error' => 'Firma de Telegram inválida'], 403);
            }

            $provider = 'telegram';
            $socialUser = (object)[
                'id' => $authData['id'],
                'name' => ($authData['first_name'] ?? '') . (isset($authData['last_name']) ? ' ' . $authData['last_name'] : ''),
                'email' => isset($authData['username']) ? $authData['username'] . '@telegram.local' : $authData['id'] . '@telegram.local',
                'avatar' => $authData['photo_url'] ?? null,
            ];

            // Ищем по ID провайдера
            $user = User::where('telegram_id', $socialUser->id)->first();

            // Если не нашли по ID, но есть Email, ищем по Email
            if (!$user && $socialUser->email) {
                $existingUser = User::where('email', $socialUser->email)->first();
                if ($existingUser && $existingUser->role === 'admin') {
                    \Illuminate\Support\Facades\Log::alert('Attempted OAuth Hijack on Admin Account via Telegram: ' . $socialUser->email);
                    return response()->json(['error' => 'No permitido'], 403);
                }
                $user = $existingUser;
            }

            if (!$user) {
                $user = new User();
                $user->name = $socialUser->name ?: 'telegram_user_' . rand(1000, 9999);
                $user->email = $socialUser->email;
                $user->telegram_id = $socialUser->id;
                $user->avatar_url = $socialUser->avatar;
                $user->role = 'individual';
                $user->ip_address = substr(hash('sha256', $request->ip()), 0, 45);
                $user->save();
            } elseif (!$user->telegram_id) {
                $user->telegram_id = $socialUser->id;
                $user->save();
            }

            $this->ensureReferralCode($user);

            // Проверка 2FA
            if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
                return response()->json([
                    'requires_2fa' => true,
                    'email' => $user->email,
                ]);
            }

            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'token' => $token,
                'user'  => $user->makeHidden(['password', 'remember_token']),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Telegram Widget Error: ' . $e->getMessage());
            return response()->json(['error' => 'Error de autenticación de Telegram'], 500);
        }
    }
}
