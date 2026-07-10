<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaCapiService
{
    public function send(
        string $eventName,
        Request $request,
        ?object $user = null,
        array $customData = [],
        ?string $eventId = null,
        ?string $eventSourceUrl = null,
        array $userDataOverrides = []
    ): array {
        $pixelId = config('services.facebook.pixel_id', env('FACEBOOK_PIXEL_ID'));
        $token = config('services.facebook.access_token', env('FACEBOOK_ACCESS_TOKEN'));
        $version = config('services.facebook.graph_version', env('FACEBOOK_GRAPH_VERSION', 'v25.0'));

        if (!$pixelId || !$token) {
            Log::warning('Meta CAPI skipped: missing pixel id or access token', [
                'event_name' => $eventName,
                'has_pixel_id' => (bool) $pixelId,
                'has_token' => (bool) $token,
            ]);

            return [
                'ok' => false,
                'skipped' => true,
                'reason' => 'missing_pixel_or_token',
                'event_id' => $eventId,
            ];
        }

        $eventId = $eventId ?: $this->makeEventId($eventName, $customData['listing_id'] ?? null);

        $payload = [
            'data' => [[
                'event_name' => $eventName,
                'event_time' => time(),
                'event_id' => $eventId,
                'action_source' => 'website',
                'event_source_url' => $eventSourceUrl ?: $request->headers->get('referer') ?: url('/'),
                'user_data' => $this->userData($request, $user, $userDataOverrides),
                'custom_data' => $customData,
            ]],
        ];

        if ($testCode = env('FACEBOOK_TEST_EVENT_CODE')) {
            $payload['test_event_code'] = $testCode;
        }

        try {
            $response = Http::timeout(8)
                ->retry(2, 250)
                ->post("https://graph.facebook.com/{$version}/{$pixelId}/events", array_merge($payload, [
                    'access_token' => $token,
                ]));

            Log::info('Meta CAPI response', [
                'event_name' => $eventName,
                'event_id' => $eventId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [
                'ok' => $response->successful(),
                'status' => $response->status(),
                'event_id' => $eventId,
                'body' => $response->json(),
            ];
        } catch (\Throwable $e) {
            Log::error('Meta CAPI failed', [
                'event_name' => $eventName,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'event_id' => $eventId,
                'error' => $e->getMessage(),
            ];
        }
    }

    private function userData(Request $request, ?object $user = null, array $overrides = []): array
    {
        $data = [
            'client_ip_address' => $overrides['client_ip_address'] ?? $request->ip(),
            'client_user_agent' => $overrides['client_user_agent'] ?? $request->userAgent(),
        ];

        if ($fbp = ($overrides['fbp'] ?? $request->cookie('_fbp'))) {
            $data['fbp'] = $fbp;
        }

        if ($fbc = ($overrides['fbc'] ?? $request->cookie('_fbc'))) {
            $data['fbc'] = $fbc;
        }

        if ($user) {
            if (!empty($user->email) && !str_ends_with(strtolower((string) $user->email), '.local')) {
                $data['em'] = [$this->hashEmail($user->email)];
            }

            $rawPhone = $user->phone ?? $user->phone_number ?? null;
            if (!empty($rawPhone)) {
                $phone = $this->normalizePhone((string) $rawPhone);
                if ($phone !== '') {
                    $data['ph'] = [$this->hashValue($phone)];
                }
            }

            if (!empty($user->id)) {
                $data['external_id'] = [$this->hashValue((string) $user->id)];
            }
        }

        return array_filter($data, fn ($value) => !empty($value));
    }

    private function hashEmail(string $email): string
    {
        return $this->hashValue(strtolower(trim($email)));
    }

    private function normalizePhone(string $phone): string
    {
        return preg_replace('/\D+/', '', $phone) ?: '';
    }

    private function hashValue(string $value): string
    {
        return hash('sha256', trim(strtolower($value)));
    }

    private function makeEventId(string $eventName, mixed $id = null): string
    {
        $suffix = $id ? (string) $id : bin2hex(random_bytes(6));

        return strtolower($eventName) . '_' . $suffix . '_' . now()->timestamp;
    }
}
