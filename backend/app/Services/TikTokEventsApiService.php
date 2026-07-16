<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TikTokEventsApiService
{
    public function send(
        string $eventName,
        Request $request,
        ?object $user = null,
        array $properties = [],
        ?string $eventId = null,
        ?string $eventSourceUrl = null,
        array $userDataOverrides = []
    ): array {
        $pixelCode = (string) config('services.tiktok.pixel_code', '');
        $accessToken = (string) config('services.tiktok.access_token', '');
        $endpoint = (string) config(
            'services.tiktok.events_api_endpoint',
            'https://business-api.tiktok.com/open_api/v1.3/event/track/'
        );

        if ($pixelCode === '' || $accessToken === '') {
            Log::warning('TikTok Events API skipped: missing pixel code or access token', [
                'event_name' => $eventName,
                'has_pixel_code' => $pixelCode !== '',
                'has_access_token' => $accessToken !== '',
            ]);

            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'missing_pixel_or_token',
                'event_id' => $eventId ? $this->normalizeEventId($eventId) : null,
            ];
        }

        $normalizedEventId = $this->normalizeEventId(
            $eventId ?: $this->makeEventId($eventName, $properties['order_id'] ?? $properties['listing_id'] ?? null)
        );
        $sourceUrl = $eventSourceUrl
            ?: $request->headers->get('referer')
            ?: config('app.frontend_url', 'https://mercasto.com');

        $event = array_filter([
            'event' => $eventName,
            'event_time' => time(),
            'event_id' => $normalizedEventId,
            'user' => $this->userData($request, $user, $userDataOverrides),
            'properties' => $this->properties($properties),
            'page' => array_filter([
                'url' => $sourceUrl,
                'referrer' => $userDataOverrides['referrer']
                    ?? $request->headers->get('referer'),
            ], fn ($value) => $value !== null && $value !== ''),
        ], fn ($value) => $value !== null && $value !== [] && $value !== '');

        $payload = [
            'event_source' => 'web',
            'event_source_id' => $pixelCode,
            'data' => [$event],
        ];

        if ($testEventCode = (string) config('services.tiktok.test_event_code', '')) {
            $payload['test_event_code'] = $testEventCode;
        }

        try {
            $response = Http::timeout(8)
                ->retry(2, 250)
                ->acceptJson()
                ->withHeaders(['Access-Token' => $accessToken])
                ->post($endpoint, $payload);

            $body = $response->json();
            $code = is_array($body) ? ($body['code'] ?? null) : null;
            $accepted = $response->successful() && ($code === null || (int) $code === 0);

            Log::info('TikTok Events API response', [
                'event_name' => $eventName,
                'event_id' => $normalizedEventId,
                'status' => $response->status(),
                'code' => $code,
                'message' => is_array($body) ? ($body['message'] ?? null) : null,
                'request_id' => is_array($body) ? ($body['request_id'] ?? data_get($body, 'data.request_id')) : null,
            ]);

            return [
                'ok' => $accepted,
                'status' => $response->status(),
                'code' => $code,
                'message' => is_array($body) ? ($body['message'] ?? null) : null,
                'event_id' => $normalizedEventId,
                'body' => $body,
            ];
        } catch (\Throwable $e) {
            Log::error('TikTok Events API failed', [
                'event_name' => $eventName,
                'event_id' => $normalizedEventId,
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'event_id' => $normalizedEventId,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function normalizeEventId(string $eventId): string
    {
        $eventId = trim($eventId);

        return preg_match('/^[a-f0-9]{64}$/i', $eventId)
            ? strtolower($eventId)
            : hash('sha256', $eventId);
    }

    private function userData(Request $request, ?object $user, array $overrides): array
    {
        $data = array_filter([
            'ip' => $overrides['ip'] ?? $overrides['client_ip_address'] ?? $request->ip(),
            'user_agent' => $overrides['user_agent'] ?? $overrides['client_user_agent'] ?? $request->userAgent(),
            'ttp' => $this->cleanScalar($overrides['ttp'] ?? $this->requestCookie($request, '_ttp'), 512),
            'ttclid' => $this->cleanScalar(
                $overrides['ttclid']
                    ?? $request->input('ttclid')
                    ?? $request->query('ttclid')
                    ?? $this->ttclidFromUrl((string) $request->headers->get('referer', '')),
                512
            ),
        ], fn ($value) => $value !== null && $value !== '');

        if ($user) {
            if (! empty($user->email) && ! str_ends_with(strtolower((string) $user->email), '.local')) {
                $data['email'] = $this->hashEmail((string) $user->email);
            }

            $rawPhone = $user->phone ?? $user->phone_number ?? null;
            if (! empty($rawPhone)) {
                $phone = $this->normalizePhone((string) $rawPhone);
                if ($phone !== '') {
                    $data['phone'] = hash('sha256', $phone);
                }
            }

            if (! empty($user->id)) {
                $data['external_id'] = hash('sha256', strtolower(trim((string) $user->id)));
            }
        }

        foreach (['email', 'phone', 'external_id'] as $key) {
            if (! empty($overrides[$key])) {
                $value = trim((string) $overrides[$key]);
                $data[$key] = preg_match('/^[a-f0-9]{64}$/i', $value)
                    ? strtolower($value)
                    : hash('sha256', strtolower($value));
            }
        }

        return $data;
    }

    private function properties(array $properties): array
    {
        $contents = [];
        foreach (array_slice((array) ($properties['contents'] ?? []), 0, 10) as $content) {
            if (! is_array($content)) {
                continue;
            }

            $normalized = array_filter([
                'content_id' => $this->cleanScalar($content['content_id'] ?? $content['id'] ?? null, 180),
                'content_type' => $this->cleanScalar($content['content_type'] ?? 'product', 40),
                'content_name' => $this->cleanScalar($content['content_name'] ?? $content['name'] ?? null, 200),
                'content_category' => $this->cleanScalar($content['content_category'] ?? $content['category'] ?? null, 120),
                'price' => $this->number($content['price'] ?? $content['item_price'] ?? null),
                'quantity' => $this->number($content['quantity'] ?? $content['num_items'] ?? 1),
                'brand' => $this->cleanScalar($content['brand'] ?? null, 120),
            ], fn ($value) => $value !== null && $value !== '');

            if ($normalized !== []) {
                $contents[] = $normalized;
            }
        }

        $result = array_filter([
            'contents' => $contents ?: null,
            'content_type' => $this->cleanScalar($properties['content_type'] ?? null, 40),
            'content_ids' => isset($properties['content_ids'])
                ? array_values(array_filter(array_map(
                    fn ($value) => $this->cleanScalar($value, 180),
                    array_slice((array) $properties['content_ids'], 0, 10)
                )))
                : null,
            'content_name' => $this->cleanScalar($properties['content_name'] ?? null, 200),
            'content_category' => $this->cleanScalar($properties['content_category'] ?? $properties['category'] ?? null, 120),
            'search_string' => $this->cleanScalar($properties['search_string'] ?? null, 200),
            'description' => $this->cleanScalar($properties['description'] ?? null, 240),
            'status' => $this->cleanScalar($properties['status'] ?? null, 80),
            'currency' => isset($properties['currency']) ? strtoupper((string) $properties['currency']) : null,
            'value' => $this->number($properties['value'] ?? null),
            'quantity' => $this->number($properties['quantity'] ?? $properties['num_items'] ?? null),
            'order_id' => $this->cleanScalar($properties['order_id'] ?? null, 180),
        ], fn ($value) => $value !== null && $value !== [] && $value !== '');

        return $result;
    }

    private function requestCookie(Request $request, string $cookieName): ?string
    {
        $value = $this->cleanScalar($request->cookie($cookieName), 512);
        if ($value !== null) {
            return $value;
        }

        foreach (explode(';', (string) $request->headers->get('cookie', '')) as $pair) {
            [$name, $rawValue] = array_pad(explode('=', trim($pair), 2), 2, null);
            if ($rawValue === null || rawurldecode(trim((string) $name)) !== $cookieName) {
                continue;
            }

            return $this->cleanScalar(rawurldecode($rawValue), 512);
        }

        return null;
    }

    private function ttclidFromUrl(string $url): ?string
    {
        if ($url === '') {
            return null;
        }

        $query = parse_url($url, PHP_URL_QUERY);
        if (! is_string($query)) {
            return null;
        }

        parse_str($query, $params);

        return $this->cleanScalar($params['ttclid'] ?? null, 512);
    }

    private function hashEmail(string $email): string
    {
        return hash('sha256', strtolower(trim($email)));
    }

    private function normalizePhone(string $phone): string
    {
        $raw = trim($phone);
        $digits = preg_replace('/\D+/', '', $raw) ?: '';

        if ($digits === '') {
            return '';
        }

        return str_starts_with($raw, '+') ? '+' . $digits : $digits;
    }

    private function cleanScalar(mixed $value, int $maxLength): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $clean = trim((string) $value, " \t\n\r\0\x0B\"");

        return $clean === '' ? null : mb_substr($clean, 0, $maxLength);
    }

    private function number(mixed $value): int|float|null
    {
        if (! is_numeric($value)) {
            return null;
        }

        $number = (float) $value;

        return is_finite($number) && $number >= 0 ? $number : null;
    }

    private function makeEventId(string $eventName, mixed $id): string
    {
        $suffix = $id !== null && $id !== '' ? (string) $id : bin2hex(random_bytes(8));

        return strtolower($eventName) . '_' . $suffix . '_' . now()->timestamp;
    }
}
