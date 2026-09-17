<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Audit trail for data-subject rights activity (LFPDPPP / ARCO).
 *
 * Every export of personal data and every erasure that touches retained consent proof
 * is recorded on the dedicated `security` log channel. Context is deliberately
 * pseudonymous: the actor id is the only identifier, IP addresses are stored as an
 * HMAC fingerprint, and no exported payload is ever written to the log.
 */
final class DataSubjectAudit
{
    /**
     * @param  array<string, mixed>  $context
     */
    public static function record(string $event, Request $request, array $context = []): void
    {
        try {
            Log::channel('security')->info($event, array_filter(
                array_merge([
                    'event' => $event,
                    'route' => self::routeTemplate($request),
                    'method' => strtoupper($request->method()),
                    'actor_id' => $request->user()?->getAuthIdentifier(),
                    'ip_hash' => self::fingerprint($request->ip()),
                ], $context),
                static fn (mixed $value): bool => $value !== null && $value !== '',
            ));
        } catch (\Throwable) {
            // Never let audit logging break a data-subject right.
            error_log('Mercasto data-subject audit logging failed');
        }
    }

    public static function fingerprint(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        return hash_hmac('sha256', trim($value), (string) config('app.key', 'mercasto-data-subject'));
    }

    private static function routeTemplate(Request $request): string
    {
        $route = $request->route();

        if (is_object($route) && method_exists($route, 'uri')) {
            $uri = ltrim((string) $route->uri(), '/');

            return str_starts_with($uri, 'api/') ? $uri : 'api/'.$uri;
        }

        return trim($request->path(), '/');
    }
}
