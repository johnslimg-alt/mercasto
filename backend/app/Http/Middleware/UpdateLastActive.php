<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class UpdateLastActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $user = $request->user();

        if ($user) {
            $cacheKey = 'last_active_' . $user->id;

            if (! Cache::has($cacheKey)) {
                // Use DB::table() directly to avoid Eloquent save() overwriting
                // columns updated during this request (e.g. phone verification)
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['last_active_at' => now()]);
                Cache::put($cacheKey, true, now()->addMinutes(2));
            }
        }

        return $response;
    }
}
