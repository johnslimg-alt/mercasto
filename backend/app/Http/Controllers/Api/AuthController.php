<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
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
            'role' => 'nullable|in:individual,business',
        ]);

        $ip = $request->ip();
        $role = $request->input('role', 'individual');

        // Ограничение: 1 аккаунт individual и 1 аккаунт business на один IP
        $existingAccounts = User::where('ip_address', $ip)->get();
        if ($existingAccounts->where('role', $role)->count() >= 1) {
            throw ValidationException::withMessages([
                'ip_address' => ['Solo se permite crear una cuenta de tipo "' . ($role === 'business' ? 'Empresa' : 'Particular') . '" por dirección IP.'],
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

        // Кошелек (Wallet) будет создан автоматически благодаря событию booted() в модели User, которое мы обсуждали

        // Создаем токен Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Пользователь успешно зарегистрирован',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
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
                'email' => ['Предоставленные учетные данные неверны.'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();

        // Проверка, включена ли 2FA
        if ($user->two_factor_secret && $user->two_factor_confirmed_at) {
            return response()->json(['two_factor' => true]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Успешный вход',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
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
                'message' => 'Успешный вход',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user
            ]);
        }

        // Проверка кодов восстановления
        foreach (json_decode($user->two_factor_recovery_codes) as $recoveryCode) {
            if (hash_equals($recoveryCode, $request->code)) {
                // Можно добавить логику для удаления использованного кода
                $token = $user->createToken('auth_token')->plainTextToken;
                return response()->json(['access_token' => $token, 'token_type' => 'Bearer', 'user' => $user]);
            }
        }

        return response()->json(['message' => 'Invalid 2FA code.'], 422);
    }

    /**
     * Запрос SMS кода для входа (Phone Auth)
     */
    public function requestPhoneCode(Request $request)
    {
        $request->validate(['phone_number' => 'required|string|min:10|max:20']);
        
        $code = rand(100000, 999999);
        Cache::put('phone_auth_' . $request->phone_number, $code, now()->addMinutes(10));

        // Для продакшена: здесь вызывается сервис отправки SMS (например, Twilio или AWS SNS)
        // Для разработки мы просто логируем код
        Log::info("SMS Code for {$request->phone_number}: {$code}");

        return response()->json(['message' => 'Código SMS enviado. (Revisa los logs del servidor)']);
    }

    /**
     * Вход или регистрация по SMS коду (Phone Auth)
     */
    public function verifyPhoneCode(Request $request)
    {
        $request->validate(['phone_number' => 'required|string|min:10|max:20', 'code' => 'required|string|size:6']);

        $cachedCode = Cache::get('phone_auth_' . $request->phone_number);

        if (!$cachedCode || $cachedCode != $request->code) {
            throw ValidationException::withMessages(['code' => ['Código SMS inválido o expirado.']]);
        }
        Cache::forget('phone_auth_' . $request->phone_number);

        $user = User::where('phone_number', $request->phone_number)->first();
        if (!$user) {
            $user = new User();
            $user->phone_number = $request->phone_number;
            $user->name = 'Usuario ' . substr($request->phone_number, -4);
            $user->email = $request->phone_number . '@mercasto.local';
            $user->password = Hash::make(Str::random(16));
            $user->role = 'individual';
            $user->ip_address = $request->ip();
            $user->save();
        }

        return response()->json(['message' => 'Успешный вход', 'access_token' => $user->createToken('auth_token')->plainTextToken, 'token_type' => 'Bearer', 'user' => $user]);
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

            $resetUrl = env('FRONTEND_URL', 'https://mercasto.com') . "/?reset_token={$token}&email=" . urlencode($request->email);

            Mail::raw("Para restablecer tu contraseña, haz clic en el siguiente enlace:\n\n$resetUrl\n\nSi no solicitaste este cambio, puedes ignorar este correo.", function($message) use ($request) {
                $message->to($request->email)->subject('Restablecer contraseña - Mercasto');
            });
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

    /**
     * Перенаправление на страницу авторизации провайдера
     */
    public function redirectToProvider($provider)
    {
        $allowedProviders = ['google', 'apple', 'telegram'];
        if (!in_array($provider, $allowedProviders)) {
            return response()->json(['error' => 'Proveedor no soportado'], 400);
        }
        
        return Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * Обработка ответа от провайдера
     */
    public function handleProviderCallback(Request $request, $provider)
    {
        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
            
            // Ищем по ID провайдера
            $user = User::where("{$provider}_id", $socialUser->id)->first();

            // Если не нашли по ID, но есть Email, ищем по Email для связывания аккаунтов
            if (!$user && $socialUser->email) {
                $user = User::where('email', $socialUser->email)->first();
            }
            
            if (!$user) {
                $user = new User();
                // У некоторых провайдеров (например Telegram) может не быть Email, генерируем заглушку
                $user->name = $socialUser->name ?? "{$provider}_user_" . rand(1000, 9999);
                $user->email = $socialUser->email ?? "{$socialUser->id}@{$provider}.local";
                $user->{"{$provider}_id"} = $socialUser->id;
                $user->avatar_url = $socialUser->avatar;
                $user->role = 'individual';
                $user->ip_address = $request->ip();
                $user->save();
            } elseif (!$user->{"{$provider}_id"}) {
                $user->{"{$provider}_id"} = $socialUser->id;
                $user->save();
            }

            $token = $user->createToken('auth_token')->plainTextToken;
        return redirect()->away(env('FRONTEND_URL', 'https://mercasto.com') . '/?token=' . $token);
    } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error(ucfirst($provider) . ' OAuth Error: ' . $e->getMessage());
        return redirect()->away(env('FRONTEND_URL', 'https://mercasto.com') . '/?error=oauth_failed');
        }
    }
}