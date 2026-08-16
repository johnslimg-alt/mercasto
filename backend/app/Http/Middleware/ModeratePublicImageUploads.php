<?php

namespace App\Http\Middleware;

use App\Services\PublicImageModerationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ModeratePublicImageUploads
{
    private const ROUTES = [
        'api/user/avatar' => ['field' => 'avatar', 'context' => 'avatar público de usuario'],
        'api/user/profile' => ['field' => 'avatar', 'context' => 'avatar público actualizado desde el perfil'],
        'api/user/business-profile/logo' => ['field' => 'logo', 'context' => 'logotipo público de negocio'],
        'api/user/business-profile/banner' => ['field' => 'banner', 'context' => 'portada pública de negocio'],
        'api/admin/banners/upload' => ['field' => 'image', 'context' => 'banner publicitario público administrado por Mercasto'],
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

            $file = $request->file($rule['field']);
            if ($file !== null && $file->isValid()) {
                $this->moderation->assertApproved($file, $rule['context'], $rule['field']);
            }
            break;
        }

        return $next($request);
    }
}
