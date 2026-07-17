<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MobilePushController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:4096',
            'provider' => 'required|in:fcm,hms',
            'platform' => 'required|in:android,ios',
            'device_id' => 'nullable|string|max:255',
            'app_version' => 'nullable|string|max:32',
        ]);

        $tokenHash = hash('sha256', $validated['token']);

        $now = now();
        $attributes = [
            'user_id' => $request->user()->id,
            'provider' => $validated['provider'],
            'platform' => $validated['platform'],
            'token' => $validated['token'],
            'device_id' => $validated['device_id'] ?? null,
            'app_version' => $validated['app_version'] ?? null,
            'last_seen_at' => $now,
            'updated_at' => $now,
        ];

        DB::table('mobile_push_tokens')->insertOrIgnore(
            $attributes + [
                'token_hash' => $tokenHash,
                'created_at' => $now,
            ]
        );

        DB::table('mobile_push_tokens')
            ->where('token_hash', $tokenHash)
            ->update($attributes);

        return response()->json(['success' => true]);
    }

    public function unregister(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string|max:4096',
        ]);

        DB::table('mobile_push_tokens')
            ->where('user_id', $request->user()->id)
            ->where('token_hash', hash('sha256', $validated['token']))
            ->delete();

        return response()->json(['success' => true]);
    }
}
