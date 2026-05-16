<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
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
                $user->timestamps = false;
                $user->last_active_at = now();
                $user->save();
                Cache::put($cacheKey, true, now()->addMinutes(2));
            }
        }

        return $response;
    }
}
