<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceAdminRouteRole
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->requiresAdmin($request)) {
            $user = $request->user() ?: Auth::guard('sanctum')->user();
            abort_unless($user, 401, 'Unauthenticated.');
            abort_unless($user->role === 'admin', 403, 'Acceso denegado');
        }

        return $next($request);
    }

    private function requiresAdmin(Request $request): bool
    {
        if ($request->is('api/admin', 'api/admin/*')) {
            return true;
        }

        if ($request->is('api/categories', 'api/categories/*') && ! $request->isMethod('GET')) {
            return true;
        }

        if ($request->is('api/users') && $request->isMethod('GET')) {
            return true;
        }

        return ($request->is('api/users/*/role') && $request->isMethod('POST'))
            || ($request->is('api/users/*/verify') && $request->isMethod('POST'))
            || ($request->is('api/users/*') && $request->isMethod('DELETE'));
    }
}
