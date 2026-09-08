<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAiAdsCapiService
{
    public function send(
        string $eventType,
        Request $request,
        ?object $user = null,
        array $data = [],
        ?string $eventId = null,
        ?string $sourceUrl = null,
        array $userDataOverrides = [],
        ?string $customEventName = null
    ): array {
        try {
            $pixelId = config('services.openai_ads.pixel_id');
            $apiKey = config('services.openai_ads.api_key');
            $endpoint = (string) config(
                'services.openai_ads.events_api_endpoint',
                'https://bzr.openai.com/v1/events'
            );

            if (!$pixelId || !$apiKey) {
                return [
                    'ok' => false,
                    'skipped' => true,
                    'reason' => 'missing_pixel_or_api_key',
                    'event_id' => $eventId,
                ];
            }

            $eventId = $eventId ?: $this->makeEventId($eventType);
            $event = [
                'id' => $eventId,
                'type' => $eventType,
                'timestamp_ms' => (int) floor(microtime(true) * 1000),
                'source_url' => $this->sourceUrl(
                    $request,
                    $sourceUrl ?: $request->headers->get('referer')
                ),
                'action_source' => 'web',
                'data' => $data,
            ];

            if ($customEventName) {
                $event['custom_event_name'] = $customEventName;
            }
            if ($oppref = $this->cookieValue(
                $request,
                $userDataOverrides,
                'oppref',
                '__oppref'
            )) {
                $event['oppref'] = $oppref;
            }
            if ($userData = $this->userData($request, $user, $userDataOverrides)) {
                $event['user'] = $userData;
            }

            $payload = [
                'validate_only' => (bool) config('services.openai_ads.validate_only', false),
                'integration_source' => 'mercasto_web',
                'events' => [$event],
            ];

            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->asJson()
                ->timeout(8)
                ->retry(2, 250)
                ->post(
                    rtrim($endpoint, '?') . '?pid=' . rawurlencode((string) $pixelId),
                    $payload
                );

            Log::info('OpenAI Ads CAPI response', [
                'event_type' => $eventType,
                'event_id' => $eventId,
                'status' => $response->status(),
            ]);

            return [
                'ok' => $response->successful(),
                'status' => $response->status(),
                'event_id' => $eventId,
                'body' => $response->json(),
            ];
        } catch (\Throwable $e) {
            Log::error('OpenAI Ads CAPI failed', [
                'event_type' => $eventType,
                'event_id' => $eventId,
                'exception' => $e::class,
            ]);

            return [
                'ok' => false,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function userData(Request $request, ?object $user, array $overrides): array
    {
        $data = array_filter([
            'ip_address' => $overrides['client_ip_address'] ?? $request->ip(),
            'user_agent' => $overrides['client_user_agent'] ?? $request->userAgent(),
            'obref' => $this->cookieValue($request, $overrides, 'obref', '__obref'),
        ], fn ($value) => $value !== null && $value !== '');

        if ($user) {
            if (!empty($user->email) && !str_ends_with(strtolower((string) $user->email), '.local')) {
                $email = strtolower(trim((string) $user->email));
                $data['emails_sha256'] = [hash('sha256', $email)];
            }

            $phone = $this->normalizePhone((string) ($user->phone ?? $user->phone_number ?? ''));
            if ($phone !== '') {
                $data['phone_numbers_sha256'] = [hash('sha256', $phone)];
            }

            if (!empty($user->id)) {
                $data['external_ids_sha256'] = [hash('sha256', trim((string) $user->id))];
            }
        }

        return $data;
    }

    private function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s().\-]+/', '', trim($phone)) ?? '';
        $phone = ltrim($phone, '+');
        $phone = ltrim($phone, '0');
        return preg_match('/^\d{8,15}$/', $phone) ? $phone : '';
    }

    private function cookieValue(
        Request $request,
        array $overrides,
        string $overrideKey,
        string $cookieName
    ): ?string {
        if (array_key_exists($overrideKey, $overrides) && is_scalar($overrides[$overrideKey])) {
            return $this->opaqueValue((string) $overrides[$overrideKey]);
        }

        foreach (explode(';', (string) $request->headers->get('cookie', '')) as $pair) {
            $parts = explode('=', ltrim($pair), 2);
            if (count($parts) !== 2 || trim($parts[0]) !== $cookieName) {
                continue;
            }

            return $this->opaqueValue($parts[1]);
        }

        return $this->opaqueValue((string) $request->cookie($cookieName, ''));
    }

    private function opaqueValue(string $value): ?string
    {
        if ($value === '' || strlen($value) > 2048) {
            return null;
        }

        return $value;
    }

    private function sourceUrl(Request $request, ?string $sourceUrl): string
    {
        $canonical = rtrim((string) config('app.frontend_url', 'https://mercasto.com'), '/');
        $canonicalParts = parse_url($canonical);
        $canonicalOrigin = $this->originFromParts($canonicalParts);
        if ($canonicalOrigin === null) {
            $canonicalOrigin = 'https://mercasto.com';
        }

        $candidate = trim((string) $sourceUrl);
        if ($candidate === '' || ! filter_var($candidate, FILTER_VALIDATE_URL)) {
            return $canonicalOrigin;
        }

        $parts = parse_url($candidate);
        $candidateOrigin = $this->originFromParts($parts);
        if ($candidateOrigin === null || strcasecmp($candidateOrigin, $canonicalOrigin) !== 0) {
            return $canonicalOrigin;
        }

        $path = isset($parts['path']) && is_string($parts['path']) ? $parts['path'] : '/';
        if ($path === '' || $path[0] !== '/') {
            $path = '/';
        }

        return $canonicalOrigin . ($path === '/' ? '' : $path);
    }

    private function originFromParts(array|false $parts): ?string
    {
        if (! is_array($parts)) {
            return null;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        if (! in_array($scheme, ['http', 'https'], true) || $host === '') {
            return null;
        }

        $port = isset($parts['port']) ? ':' . (int) $parts['port'] : '';
        return $scheme . '://' . $host . $port;
    }

    private function makeEventId(string $eventType): string
    {
        return strtolower($eventType) . '_' . bin2hex(random_bytes(10));
    }
}
