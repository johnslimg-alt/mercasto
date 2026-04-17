<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Events\NewNotification;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class ProfileController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещен.'], 403);
        }

        $query = User::query();
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
        }
        return response()->json($query->latest()->paginate(20));
    }

    public function show(Request $request)
    {
        // Возвращаем пользователя
        return response()->json($request->user());
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'avatar' => 'nullable|image|max:5120', // Максимум 5МБ
        ]);

        $user->name = $request->name;

        // Обработка загрузки аватарки
        if ($request->hasFile('avatar')) {
            // Если у пользователя уже есть аватарка (и это локальный файл), удаляем старую
            if ($user->avatar_url && !str_starts_with($user->avatar_url, 'http')) {
                Storage::disk('public')->delete($user->avatar_url);
            }
            $user->avatar_url = $request->file('avatar')->store('avatars', 'public');
        }

        $user->save();

        return response()->json($user);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $rules = [
            'new_password' => 'required|string|min:8',
        ];

        // Если у пользователя уже установлен пароль, требуем его для проверки
        if ($user->password) {
            $rules['current_password'] = 'required|string';
        }

        $request->validate($rules);

        if ($user->password && !Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'La contraseña actual es incorrecta.'], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

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

        $confirmUrl = env('FRONTEND_URL', 'http://localhost:5173') . "/?email_token={$token}";

        Mail::raw("Para confirmar tu nuevo correo electrónico, haz clic en el siguiente enlace:\n\n$confirmUrl\n\nSi no solicitaste este cambio, puedes ignorar este mensaje.", function($message) use ($request) {
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

        $user->email = $user->pending_email;
        $user->email_verified_at = now();
        $user->pending_email = null;
        $user->email_verification_token = null;
        $user->save();

        return response()->json(['message' => 'Correo actualizado con éxito.', 'user' => $user]);
    }

    public function createNotification(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:1000',
        ]);

        DB::table('user_notifications')->insert([
            'user_id' => $request->user()->id,
            'title' => $request->title,
            'message' => $request->message,
            'is_read' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function getNotifications(Request $request)
    {
        $notifications = DB::table('user_notifications')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();
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

        $user->notification_preferences = [
            'email_alerts' => $request->boolean('email_alerts', true),
            'push_notifications' => $request->boolean('push_notifications', true),
            'marketing' => $request->boolean('marketing', false),
        ];
        $user->save();

        return response()->json(['message' => 'Preferencias actualizadas.', 'user' => $user]);
    }

    public function verifyUser(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещен. Только для администраторов.'], 403);
        }

        $userToVerify = User::findOrFail($id);
        $userToVerify->is_verified = !$userToVerify->is_verified;
        $userToVerify->save();

        return response()->json(['message' => 'Статус верификации обновлен', 'is_verified' => $userToVerify->is_verified]);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещен.'], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Пользователь удален']);
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
            return response()->json(['message' => 'Доступ запрещен'], 403);
        }
        $reports = DB::table('user_reports')
            ->join('users as reported', 'user_reports.reported_user_id', '=', 'reported.id')
            ->leftJoin('users as reporter', 'user_reports.reporter_id', '=', 'reporter.id')
            ->select('user_reports.*', 'reported.name as reported_name', 'reported.email as reported_email', 'reporter.name as reporter_name')
            ->orderByDesc('user_reports.created_at')
            ->get();
        return response()->json($reports);
    }

    public function deleteUserReport(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещен'], 403);
        }
        DB::table('user_reports')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    public function pushSubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

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
        DB::table('push_subscriptions')->where('endpoint', $request->endpoint)->delete();
        return response()->json(['success' => true]);
    }
}