<?php

namespace App\Http\Middleware;

use App\Services\PublicImageModerationService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpFoundation\Response;

class ModeratePublicImageUploads
{
    private const ROUTES = [
        'api/user/avatar' => [
            'field' => 'avatar',
            'context' => 'avatar público de usuario',
            'rules' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
        ],
        'api/user/profile' => [
            'field' => 'avatar',
            'context' => 'avatar público actualizado desde el perfil',
            'rules' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
        ],
        'api/user/business-profile/logo' => [
            'field' => 'logo',
            'context' => 'logotipo público de negocio',
            'rules' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
        ],
        'api/user/business-profile/banner' => [
            'field' => 'banner',
            'context' => 'portada pública de negocio',
            'rules' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=4096,max_height=4096'],
        ],
        'api/admin/banners/upload' => [
            'field' => 'image',
            'context' => 'banner publicitario público administrado por Mercasto',
            'rules' => ['required', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:5120'],
            'admin' => true,
        ],
    ];

    public function __construct(private readonly PublicImageModerationService $moderation)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        foreach (self::ROUTES as $path => $rule) {
            if (! $request->is($path) || ! $request->hasFile($rule['field'])) {
                continue;
            }

            // API group middleware executes before route-level auth/throttle middleware.
            // Resolve Sanctum here so anonymous requests never consume local AI work.
            $user = $request->user() ?? Auth::guard('sanctum')->user();
            if (! $user) {
                break;
            }

            // Admin banner authorization lives in the controller. Mirror only the cheap
            // role check here so non-admin users cannot spend local AI resources.
            if (($rule['admin'] ?? false) && $user->role !== 'admin') {
                break;
            }

            $file = $request->file($rule['field']);
            if ($file === null || ! $file->isValid()) {
                break;
            }

            // Preserve the controllers' existing validation contract. Invalid MIME,
            // dimensions, or size must remain a normal 422 and must never reach AI.
            $validator = Validator::make(
                [$rule['field'] => $file],
                [$rule['field'] => $rule['rules']],
            );
            if ($validator->fails()) {
                break;
            }

            $key = 'public-image-ai:' . $user->getAuthIdentifier();
            if (RateLimiter::tooManyAttempts($key, 10)) {
                return response()->json([
                    'error' => 'Demasiadas revisiones de imagen. Intenta de nuevo en un momento.',
                    'retry_after' => RateLimiter::availableIn($key),
                ], 429);
            }

            RateLimiter::hit($key, 60);
            $this->moderation->assertApproved($file, $rule['context'], $rule['field']);
            break;
        }

        return $next($request);
    }
}
