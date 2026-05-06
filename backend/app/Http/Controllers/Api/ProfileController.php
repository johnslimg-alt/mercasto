<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Models\User;
use App\Events\NewNotification;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class ProfileController extends Controller
{
    private function imageManager(): ImageManager
    {
        return ImageManager::usingDriver(Driver::class);
    }

    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $query = User::query();
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }
        
        $users = $query->latest()->paginate(20);
        // Защита от утечки секретов 2FA в панели администратора
        $users->getCollection()->transform(function ($user) {
            return $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token']);
        });
        return response()->json($users);
    }

    public function show(Request $request)
    {
        // Защита от утечки секретов 2FA на клиенте
        return response()->json($request->user()->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token']));
    }

    /**
     * Публичный профиль пользователя для витрины магазина (Storefront)
     */
    public function publicProfile($id)
    {
        $user = User::select('id', 'name', 'avatar_url', 'role', 'is_verified', 'created_at', 'phone_number')->findOrFail($id);
        
        // GDPR & Privacy Leak Fix: Скрываем номер телефона, если продавец не является PRO-компанией
        if ($user->role !== 'business') {
            $user->phone_number = null;
        }
        
        return response()->json($user);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'avatar' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:5120|dimensions:max_width=4096,max_height=4096', // Защита от OOM Pixel Flood
        ]);

        $user->name = $request->name;

        // Обработка загрузки аватарки
        if ($request->hasFile('avatar')) {
            // Если у пользователя уже есть аватарка (и это локальный файл), удаляем старую
            if ($user->avatar_url && !str_starts_with($user->avatar_url, 'http')) {
                Storage::disk('public')->delete($user->avatar_url);
            }
            
            // Оптимизация памяти и трафика: сжимаем аватарку до 250x250px и конвертируем в WebP
            $filename = Str::uuid() . '.webp';
            $path = 'avatars/' . $filename;
            $img = $this->imageManager()
                ->decode($request->file('avatar'))
                ->cover(250, 250)
                ->encodeUsingFileExtension('webp', quality: 85);
            Storage::disk('public')->put($path, (string) $img);
            $user->avatar_url = $path;
        }

        $user->save();

        // Очищаем кэш главной страницы и фида, чтобы новые имя и аватарка мгновенно обновились в карточках объявлений
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_index_page_1');

        // Защита от утечки секретов 2FA при обновлении профиля
        return response()->json($user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password']));
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $rules = [
            'new_password' => 'required|string|min:8',
        ];

        // Умная проверка: если аккаунт создан по SMS или через соцсети (OAuth),
        // пользователь не знает свой сгенерированный пароль. Мы разрешаем установить его без подтверждения старого.
        $isPhoneAuthUser = str_ends_with($user->email, '@mercasto.local');
        $isOAuthUser = $user->google_id || $user->apple_id || $user->telegram_id;

        if ($user->password && !$isPhoneAuthUser && !$isOAuthUser) {
            $rules['current_password'] = 'required|string';
        }

        $request->validate($rules);

        if ($user->password && !$isPhoneAuthUser && !$isOAuthUser && !Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'La contraseña actual es incorrecta.'], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();
        
        // Защита от перехвата сессии (Session Fixation): отзываем все токены КРОМЕ текущего, чтобы не выкидывать пользователя
        $currentToken = $request->user()->currentAccessToken();
        if ($currentToken) {
            $user->tokens()->where('id', '!=', $currentToken->id)->delete();
        }

        return response()->json(['message' => 'Contraseña actualizada exitosamente.']);
    }

    public function requestEmailChange(Request $request)
    {
        $user = $request->user();
        
        $rules = ['new_email' => 'required|email|unique:users,email'];
        // Если у пользователя есть пароль, требуем его для безопасности
        if ($user->password) {
            $rules['password'] = 'required|string';
        }
        
        $request->validate($rules);

        if ($user->password && !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'La contraseña actual es incorrecta.'], 400);
        }

        $token = Str::random(60);
        $user->pending_email = $request->new_email;
        $user->email_verification_token = Hash::make($token);
        $user->save();

        $confirmUrl = config('app.frontend_url', 'https://mercasto.com') . "/?email_token={$token}";

        Mail::send('emails.action', [
            'title' => 'Confirma tu nuevo correo',
            'body' => 'Has solicitado cambiar el correo electrónico asociado a tu cuenta de Mercasto. Para completar este proceso, por favor verifica esta dirección haciendo clic en el botón de abajo.',
            'actionText' => 'Confirmar Correo',
            'actionUrl' => $confirmUrl,
            'footer' => 'Si no solicitaste este cambio, ignora este mensaje. Tu correo actual seguirá siendo el principal.'
        ], function($message) use ($request) {
            $message->to($request->new_email)->subject('Confirmar nuevo correo - Mercasto');
        });

        return response()->json(['message' => 'Se ha enviado un enlace de confirmación a tu nuevo correo.']);
    }

    public function confirmEmailChange(Request $request)
    {
        $user = $request->user();
        $request->validate(['token' => 'required|string']);

        if (!$user->email_verification_token || !Hash::check($request->token, $user->email_verification_token)) {
            return response()->json(['message' => 'El token es inválido o ha expirado.'], 400);
        }
        
        // Защита от Fatal 500: проверяем, не занял ли кто-то этот email пока мы ждали подтверждения
        if (User::where('email', $user->pending_email)->where('id', '!=', $user->id)->exists()) {
            return response()->json(['message' => 'Este correo electrónico ya ha sido registrado por otro usuario en el interín.'], 400);
        }

        $user->email = $user->pending_email;
        $user->email_verified_at = now();
        $user->pending_email = null;
        $user->email_verification_token = null;
        $user->save();

        // Защита от Session Fixation: отзываем старые токены КРОМЕ текущего, предотвращая угон аккаунта
        $currentToken = $request->user()->currentAccessToken();
        if ($currentToken) {
            $user->tokens()->where('id', '!=', $currentToken->id)->delete();
        }

        // Защита от утечки секретов 2FA при смене Email
        return response()->json(['message' => 'Correo actualizado con éxito.', 'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])]);
    }

    public function getNotifications(Request $request)
    {
        $notifications = DB::table('user_notifications')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->paginate(20); // Заменяем жесткий лимит на пагинацию (предотвращает потерю старых уведомлений)
        return response()->json($notifications);
    }

    public function markNotificationRead(Request $request, $id)
    {
        DB::table('user_notifications')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => true]);
        return response()->json(['success' => true]);
    }

    public function markAllNotificationsRead(Request $request)
    {
        DB::table('user_notifications')
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);
        return response()->json(['success' => true]);
    }

    public function deleteNotification(Request $request, $id)
    {
        DB::table('user_notifications')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();
        return response()->json(['success' => true]);
    }

    public function updateNotifications(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'email_alerts' => 'boolean',
            'push_notifications' => 'boolean',
            'marketing' => 'boolean',
        ]);

        // Явное преобразование в JSON для предотвращения ошибки "Array to string conversion" на сервере
        $user->notification_preferences = json_encode([
            'email_alerts' => $request->boolean('email_alerts', true),
            'push_notifications' => $request->boolean('push_notifications', true),
            'marketing' => $request->boolean('marketing', false),
        ]);
        $user->save();

        // Защита от утечки секретов 2FA при смене настроек
        return response()->json(['message' => 'Preferencias actualizadas.', 'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'email_verification_token', 'password'])]);
    }

    public function changeRole(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $request->validate(['role' => 'required|in:individual,business,admin']);
        $user = User::findOrFail($id);

        // Защита от "Мятежа Администраторов": запрещаем понижать в должности владельцев платформы
        if ($user->role === 'admin' && $request->role !== 'admin' && $user->id !== $request->user()->id) {
            return response()->json(['message' => 'No puedes cambiar el rol de otro administrador del sistema.'], 403);
        }

        $user->role = $request->role;
        $user->save();

        return response()->json(['message' => 'Rol actualizado exitosamente', 'role' => $user->role]);
    }

    public function verifyUser(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $userToVerify = User::findOrFail($id);
        $userToVerify->is_verified = !$userToVerify->is_verified;
        $userToVerify->save();

        return response()->json(['message' => 'Estado de verificación actualizado', 'is_verified' => $userToVerify->is_verified]);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        $user = User::findOrFail($id);

        // Защита от "Мятежа Администраторов" и "Самоубийства системы" через Панель Управления
        if ($user->role === 'admin') {
            if ($user->id !== $request->user()->id) {
                return response()->json(['message' => 'No puedes eliminar a otro administrador del sistema.'], 403);
            } elseif (User::where('role', 'admin')->count() <= 1) {
                return response()->json(['message' => 'No puedes eliminar tu cuenta porque eres el único administrador del sistema.'], 403);
            }
        }

        // Глубокая очистка файлов и связей при удалении пользователя администратором
        // Используем cursor() для защиты от утечки памяти (OOM) при удалении PRO-аккаунтов с тысячами объявлений
        $ads = \App\Models\Ad::where('user_id', $user->id)->cursor();
        $filesToDelete = [];
        foreach ($ads as $ad) {
            if ($ad->image_url) {
                $images = json_decode($ad->image_url, true);
                if (is_array($images)) {
                    $filesToDelete = array_merge($filesToDelete, $images);
                } elseif (is_string($images)) {
                    $filesToDelete[] = $images;
                }
            }
            if ($ad->video_url) {
                $filesToDelete[] = $ad->video_url;
            }
        }
        
        // Массовое удаление AWS S3 (Bulk Delete) — решает проблему "504 Gateway Timeout"
        if (count($filesToDelete) > 0) {
            Storage::disk('public')->delete($filesToDelete);
        }
        
        if ($user->avatar_url && !str_starts_with($user->avatar_url, 'http')) {
            Storage::disk('public')->delete($user->avatar_url);
        }

        DB::table('reviews')->where('reviewer_id', $user->id)->orWhere('seller_id', $user->id)->delete();
        DB::table('favorites')->where('user_id', $user->id)->delete();
        DB::table('user_notifications')->where('user_id', $user->id)->delete();
        DB::table('ad_clicks')->where('user_id', $user->id)->delete();
        DB::table('ad_views')->where('user_id', $user->id)->delete();
        DB::table('reports')->where('user_id', $user->id)->delete();
        DB::table('user_reports')->where('reporter_id', $user->id)->orWhere('reported_user_id', $user->id)->delete();
        DB::table('push_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('category_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('coupon_user')->where('user_id', $user->id)->delete();

        // Глубокая очистка "чужих" связей с объявлениями этого пользователя (защита от Foreign Key Crash)
        $adIds = \App\Models\Ad::where('user_id', $user->id)->pluck('id');
        DB::table('favorites')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_views')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_clicks')->whereIn('ad_id', $adIds)->delete();
        DB::table('reports')->whereIn('ad_id', $adIds)->delete();

        // Защита финансовой отчетности: платежи НЕЛЬЗЯ удалять физически. Отвязываем их, сохраняя историю для бухгалтерии.
        DB::table('payments')->where('user_id', $user->id)->update(['user_id' => null]);
        DB::table('payments')->whereIn('ad_id', $adIds)->update(['ad_id' => null]);

        // Защита от Database Bloat: отзываем все токены доступа пользователя перед удалением
        $user->tokens()->delete();

        $user->delete();

        // Сбрасываем кэш, чтобы удаленные объявления пользователя исчезли из выдачи и SEO
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        return response()->json(['message' => 'Usuario eliminado exitosamente']);
    }

    public function getSubscriptions(Request $request)
    {
        $subscriptions = DB::table('category_subscriptions')
            ->where('user_id', $request->user()->id)
            ->pluck('category_slug');
        return response()->json($subscriptions);
    }

    public function toggleSubscription(Request $request)
    {
        $request->validate(['category_slug' => 'required|string|exists:categories,slug']);
        $user = $request->user();
        $slug = $request->category_slug;

        $subscription = DB::table('category_subscriptions')
            ->where('user_id', $user->id)
            ->where('category_slug', $slug);

        if ($subscription->exists()) {
            $subscription->delete();
            return response()->json(['status' => 'unsubscribed']);
        } else {
            DB::table('category_subscriptions')->insert(['user_id' => $user->id, 'category_slug' => $slug, 'created_at' => now(), 'updated_at' => now()]);
            return response()->json(['status' => 'subscribed']);
        }
    }

    public function report(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:255',
            'comments' => 'nullable|string|max:1000'
        ]);
        
        // Защита от сбоя целостности БД (Foreign Key Violation)
        if (!User::where('id', $id)->exists()) {
            return response()->json(['message' => 'Usuario no encontrado'], 404);
        }
        
        DB::table('user_reports')->insert([
            'reported_user_id' => $id,
            'reporter_id' => auth('sanctum')->id(), // Может быть null, если гость
            'reason' => $request->reason,
            'comments' => $request->comments,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['message' => 'Reporte enviado exitosamente. Revisaremos el perfil de este usuario.']);
    }

    public function getUserReports(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        $reports = DB::table('user_reports')
            ->join('users as reported', 'user_reports.reported_user_id', '=', 'reported.id')
            ->leftJoin('users as reporter', 'user_reports.reporter_id', '=', 'reporter.id')
            ->select('user_reports.*', 'reported.name as reported_name', 'reporter.name as reporter_name')
            ->orderByDesc('user_reports.created_at')
            ->paginate(50);
        return response()->json($reports);
    }

    public function deleteUserReport(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        DB::table('user_reports')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    public function deleteAccount(Request $request)
    {
        $user = $request->user();

        // Защита от "Самоубийства системы" (Last Admin Suicide): не даем удалить последнего администратора
        if ($user->role === 'admin') {
            $adminCount = User::where('role', 'admin')->count();
            if ($adminCount <= 1) {
                return response()->json(['message' => 'No puedes eliminar tu cuenta porque eres el único administrador del sistema.'], 403);
            }
        }

        // Delete all user's ad images from storage
        // Используем cursor() для защиты от утечки памяти
        $ads = \App\Models\Ad::where('user_id', $user->id)->cursor();
        $filesToDelete = [];
        foreach ($ads as $ad) {
            if ($ad->image_url) {
                $images = json_decode($ad->image_url, true);
                if (is_array($images)) {
                    $filesToDelete = array_merge($filesToDelete, $images);
                } elseif (is_string($images)) {
                    $filesToDelete[] = $images;
                }
            }
            // Устраняем утечку дискового пространства: удаляем тяжелые видео
            if ($ad->video_url) {
                $filesToDelete[] = $ad->video_url;
            }
        }
        
        // Массовое удаление (S3 Bulk Delete)
        if (count($filesToDelete) > 0) {
            Storage::disk('public')->delete($filesToDelete);
        }

        // Удаляем аватарку пользователя, чтобы не хранить файлы-"призраки"
        if ($user->avatar_url && !str_starts_with($user->avatar_url, 'http')) {
            Storage::disk('public')->delete($user->avatar_url);
        }

        // Глубокая очистка связанных данных для предотвращения ошибок БД (Foreign Key Constraints)
        DB::table('reviews')->where('reviewer_id', $user->id)->orWhere('seller_id', $user->id)->delete();
        DB::table('favorites')->where('user_id', $user->id)->delete();
        DB::table('user_notifications')->where('user_id', $user->id)->delete();
        DB::table('ad_clicks')->where('user_id', $user->id)->delete();
        DB::table('ad_views')->where('user_id', $user->id)->delete();
        DB::table('reports')->where('user_id', $user->id)->delete();
        DB::table('user_reports')->where('reporter_id', $user->id)->orWhere('reported_user_id', $user->id)->delete();
        DB::table('payments')->where('user_id', $user->id)->delete();
        DB::table('push_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('category_subscriptions')->where('user_id', $user->id)->delete();
        DB::table('coupon_user')->where('user_id', $user->id)->delete();

        // Глубокая очистка "чужих" связей с объявлениями этого пользователя (защита от Foreign Key Crash)
        $adIds = \App\Models\Ad::where('user_id', $user->id)->pluck('id');
        DB::table('favorites')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_views')->whereIn('ad_id', $adIds)->delete();
        DB::table('ad_clicks')->whereIn('ad_id', $adIds)->delete();
        DB::table('reports')->whereIn('ad_id', $adIds)->delete();
        DB::table('payments')->whereIn('ad_id', $adIds)->delete();

        // Delete the user's ads
        \App\Models\Ad::where('user_id', $user->id)->delete();

        // Сбрасываем кэш, чтобы удаленные объявления исчезли из выдачи и SEO
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        // Revoke all tokens
        $user->tokens()->delete();

        // Delete the user
        $user->delete();

        return response()->json(['message' => 'Cuenta eliminada exitosamente.']);
    }

    public function pushSubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);
        
        // Защита от перехвата чужих уведомлений (Endpoint Hijacking)
        $existingSub = DB::table('push_subscriptions')->where('endpoint', $request->endpoint)->first();
        if ($existingSub && $existingSub->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Este dispositivo ya está registrado por otro usuario.'], 403);
        }

        // Защита от WebPush DoS: ограничиваем количество привязанных устройств (максимум 5 на пользователя)
        $userCount = DB::table('push_subscriptions')->where('user_id', $request->user()->id)->count();
        if ($userCount >= 5 && !DB::table('push_subscriptions')->where('endpoint', $request->endpoint)->exists()) {
            // Удаляем самую старую подписку, чтобы освободить место
            DB::table('push_subscriptions')->where('user_id', $request->user()->id)->orderBy('created_at', 'asc')->limit(1)->delete();
        }

        DB::table('push_subscriptions')->updateOrInsert(
            ['endpoint' => $request->endpoint],
            [
                'user_id' => $request->user()->id,
                'public_key' => $request->input('keys.p256dh'),
                'auth_token' => $request->input('keys.auth'),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        return response()->json(['success' => true]);
    }

    public function pushUnsubscribe(Request $request)
    {
        $request->validate(['endpoint' => 'required|string']);
        DB::table('push_subscriptions')
            ->where('endpoint', $request->endpoint)
            ->where('user_id', $request->user()->id) // Защита от IDOR: нельзя удалить чужую подписку
            ->delete();
        return response()->json(['success' => true]);
    }

    // --- KYC: KNOW YOUR CUSTOMER (СИСТЕМА ВЕРИФИКАЦИИ) ---

    public function submitKyc(Request $request)
    {
        $request->validate([
            'document' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $user = $request->user();
        
        if ($user->kyc_status === 'approved') {
            return response()->json(['message' => 'Tu cuenta ya está verificada.'], 400);
        }

        // Удаляем старый документ, если была предыдущая попытка
        if ($user->kyc_document_url) {
            Storage::delete($user->kyc_document_url);
        }

        // Безопасность: Сохраняем в приватную папку (не в public), чтобы никто не мог скачать паспорт по прямой ссылке
        $path = $request->file('document')->store('kyc_documents');

        $user->kyc_document_url = $path;
        $user->kyc_status = 'pending';
        $user->save();

        return response()->json(['message' => 'Documento enviado. Nuestro equipo lo revisará en breve.', 'user' => $user->makeHidden(['two_factor_secret', 'two_factor_recovery_codes', 'password'])]);
    }

    public function getPendingKyc(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        
        $users = User::where('kyc_status', 'pending')->latest()->paginate(20);
        return response()->json($users);
    }

    public function viewKycDocument(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        
        $user = User::findOrFail($id);
        if (!$user->kyc_document_url || !Storage::exists($user->kyc_document_url)) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }
        
        return Storage::download($user->kyc_document_url);
    }

    public function approveKyc(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $user = User::findOrFail($id);
        $user->kyc_status = 'approved';
        $user->is_verified = true; // Выдаем "Синюю галочку"
        $user->save();
        return response()->json(['message' => 'Usuario verificado exitosamente.']);
    }

    public function rejectKyc(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $user = User::findOrFail($id);
        $user->kyc_status = 'rejected';
        $user->save();
        return response()->json(['message' => 'Solicitud de verificación rechazada.']);
    }
}
