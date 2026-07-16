<?php

namespace Tests\Feature;

use App\Services\TikTokEventsApiService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TikTokEventsApiServiceTest extends TestCase
{
    public function test_purchase_sends_events_api_2_payload_with_match_keys(): void
    {
        config([
            'services.tiktok.pixel_code' => 'D9C3HKBC77UBS5FSD7C0',
            'services.tiktok.access_token' => 'test-token',
            'services.tiktok.events_api_endpoint' => 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        ]);

        Http::fake([
            'https://business-api.tiktok.com/*' => Http::response([
                'code' => 0,
                'message' => 'OK',
                'request_id' => 'test-request',
            ], 200),
        ]);

        $request = Request::create(
            'https://mercasto.com/api/webhooks/clip',
            'POST',
            [],
            ['_ttp' => 'ttp-cookie'],
            [],
            [
                'REMOTE_ADDR' => '192.0.2.10',
                'HTTP_USER_AGENT' => 'Clip Webhook',
                'HTTP_REFERER' => 'https://mercasto.com/?ttclid=click-from-url',
            ]
        );

        $result = app(TikTokEventsApiService::class)->send(
            'Purchase',
            $request,
            (object) [
                'id' => 42,
                'email' => 'buyer@example.com',
                'phone' => '+52 229 123 4567',
            ],
            [
                'currency' => 'MXN',
                'value' => 99,
                'order_id' => 'clip-order-42',
                'content_ids' => ['package_impulso'],
                'contents' => [[
                    'content_id' => 'package_impulso',
                    'content_type' => 'product',
                    'content_name' => 'Plan Impulso',
                    'price' => 99,
                    'quantity' => 1,
                ]],
            ],
            'purchase_clip_42',
            'https://mercasto.com/?payment=success',
            [
                'ip' => '198.51.100.24',
                'user_agent' => 'Buyer Browser',
                'ttp' => 'ttp-browser-cookie',
                'ttclid' => 'ttclid-browser',
            ]
        );

        $this->assertTrue($result['ok']);
        $this->assertSame(hash('sha256', 'purchase_clip_42'), $result['event_id']);

        Http::assertSent(function (ClientRequest $request): bool {
            $payload = $request->data();
            $event = $payload['data'][0] ?? [];
            $user = $event['user'] ?? [];
            $properties = $event['properties'] ?? [];

            return $request->url() === 'https://business-api.tiktok.com/open_api/v1.3/event/track/'
                && $request->hasHeader('Access-Token', 'test-token')
                && ($payload['event_source'] ?? null) === 'web'
                && ($payload['event_source_id'] ?? null) === 'D9C3HKBC77UBS5FSD7C0'
                && ($event['event'] ?? null) === 'Purchase'
                && ($event['event_id'] ?? null) === hash('sha256', 'purchase_clip_42')
                && ($event['page']['url'] ?? null) === 'https://mercasto.com/?payment=success'
                && ($user['email'] ?? null) === hash('sha256', 'buyer@example.com')
                && ($user['phone'] ?? null) === hash('sha256', '+522291234567')
                && ($user['external_id'] ?? null) === hash('sha256', '42')
                && ($user['ip'] ?? null) === '198.51.100.24'
                && ($user['user_agent'] ?? null) === 'Buyer Browser'
                && ($user['ttp'] ?? null) === 'ttp-browser-cookie'
                && ($user['ttclid'] ?? null) === 'ttclid-browser'
                && ($properties['currency'] ?? null) === 'MXN'
                && (float) ($properties['value'] ?? 0) === 99.0
                && ($properties['contents'][0]['content_id'] ?? null) === 'package_impulso'
                && (float) ($properties['contents'][0]['price'] ?? 0) === 99.0;
        });
    }

    public function test_missing_credentials_skips_without_http_request(): void
    {
        config([
            'services.tiktok.pixel_code' => '',
            'services.tiktok.access_token' => '',
        ]);
        Http::fake();

        $result = app(TikTokEventsApiService::class)->send(
            'Lead',
            Request::create('https://mercasto.com/api/test', 'POST'),
            null,
            [],
            'lead_1'
        );

        $this->assertFalse($result['ok']);
        $this->assertTrue($result['skipped']);
        Http::assertNothingSent();
    }
}
