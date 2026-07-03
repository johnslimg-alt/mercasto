<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BlockedUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = DB::table('blocked_users')
            ->join('users', 'blocked_users.blocked_user_id', '=', 'users.id')
            ->where('blocked_users.user_id', $request->user()->id)
            ->orderByDesc('blocked_users.created_at')
            ->get([
                'users.id',
                'users.name',
                'users.avatar_url',
                'users.city',
                'users.role',
                'users.is_verified',
                'blocked_users.created_at as blocked_at',
            ]);

        return response()->json(['data' => $users]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        if ($request->user()->id === $id) {
            return response()->json([
                'message' => 'No puedes bloquear tu propia cuenta.',
            ], 422);
        }

        User::query()->findOrFail($id);

        DB::table('blocked_users')->updateOrInsert(
            [
                'user_id' => $request->user()->id,
                'blocked_user_id' => $id,
            ],
            [
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return response()->json(['message' => 'Usuario bloqueado.']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::table('blocked_users')
            ->where('user_id', $request->user()->id)
            ->where('blocked_user_id', $id)
            ->delete();

        return response()->json(['message' => 'Usuario desbloqueado.']);
    }
}
