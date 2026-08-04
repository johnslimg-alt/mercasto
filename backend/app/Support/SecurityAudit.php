<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

final class SecurityAudit
{
    public static function record(Request $request, Response $response): void
    {
        $event = self::classify($request, $response->getStatusCode());
        if ($event === null) {
            return;
        }

        try {
            Log::channel('security')->warning(
                'security_event',
                self::context($event, $request, $response->getStatusCode()),
            );
        } catch (\Throwable) {
            error_log('Mercasto security audit logging failed');
        }
    }

    public static function classify(Request $request, int $status): ?string
    {
        if ($status < 400) {
            return null;
        }

        $path = trim($request->path(), '/');

        if ($status === 429) {
            return 'rate_limited';
        }

        if (str_starts_with($path, 'api/webhooks/')
            || $path === 'api/payment/webhook') {
            return 'webhook_rejected';
        }

        if (self::isAuthPath($path)) {
            return 'auth_rejected';
        }

        if ($status === 403) {
            return 'authorization_denied';
        }

        if (in_array($status, [413, 415, 422], true)
            && ($request->allFiles() !== [] || self::isUploadPath($path))) {
            return 'upload_rejected';
        }

        if ($status === 401) {
            return 'authentication_required';
        }

        return null;
    }

    public static function context(
        string $event,
        Request $request,
        int $status,
    ): array {
        $context = [
            'event' => $event,
            'status' => $status,
            'method' => strtoupper($request->method()),
            'route' => self::routeTemplate($request),
            'actor_id' => $request->user()?->getAuthIdentifier(),
            'ip_hash' => self::fingerprint($request->ip()),
        ];

        $email = $request->input('email');
        if (is_string($email) && trim($email) !== '') {
            $context['email_hash'] = self::fingerprint(strtolower(trim($email)));
        }

        [$parameter, $resourceId] = self::resourceIdentity($request);
        if ($parameter !== null && $resourceId !== null) {
            $context['resource_parameter'] = $parameter;
            $context['resource_id'] = $resourceId;
        }

        return array_filter(
            $context,
            static fn (mixed $value): bool => $value !== null && $value !== '',
        );
    }

    private static function isAuthPath(string $path): bool
    {
        return $path === 'api/login'
            || str_starts_with($path, 'api/login/')
            || $path === 'api/register'
            || $path === 'api/forgot-password'
            || $path === 'api/reset-password'
            || str_starts_with($path, 'api/auth/')
            || str_starts_with($path, 'api/phone/')
            || str_starts_with($path, 'api/user/two-factor-authentication');
    }

    private static function isUploadPath(string $path): bool
    {
        foreach ([
            'bulk-upload', '/avatar', '/logo', '/banner', '/kyc', '/csf',
        ] as $fragment) {
            if (str_contains($path, $fragment)) {
                return true;
            }
        }

        return false;
    }

    private static function routeTemplate(Request $request): string
    {
        $route = $request->route();
        if (is_object($route) && method_exists($route, 'uri')) {
            $uri = ltrim((string) $route->uri(), '/');
            return str_starts_with($uri, 'api/') ? $uri : 'api/' . $uri;
        }

        return trim($request->path(), '/');
    }

    private static function resourceIdentity(Request $request): array
    {
        $route = $request->route();
        if (! is_object($route) || ! method_exists($route, 'parameters')) {
            return [null, null];
        }

        $allowedParameters = [
            'id', 'ad', 'adId', 'user', 'userId', 'payment', 'paymentId',
            'report', 'reportId', 'review', 'reviewId', 'banner', 'bannerId',
        ];

        foreach ($route->parameters() as $name => $value) {
            if (! in_array((string) $name, $allowedParameters, true)) {
                continue;
            }

            if (is_object($value) && method_exists($value, 'getKey')) {
                $value = $value->getKey();
            }

            if (! is_scalar($value)) {
                continue;
            }

            $value = (string) $value;
            if (preg_match('/^(?:[0-9]+|[0-9a-f]{8}-[0-9a-f-]{27,36})$/i', $value) === 1) {
                return [substr((string) $name, 0, 40), substr($value, 0, 80)];
            }
        }

        return [null, null];
    }

    private static function fingerprint(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $key = (string) config('app.key', 'mercasto-security-audit');
        return hash_hmac('sha256', trim($value), $key);
    }
}
