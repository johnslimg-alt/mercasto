<?php

namespace Tests\Feature;

use App\Services\MetaCapiService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MetaCapiServiceTest extends TestCase
{
    public function test_purchase_uses_browser_context_overrides_and_required_custom_data(): void
    {
        config([
            'services.facebook.pixel_id' => '123456789',
            'services.facebook.access_token' => 'test-token',
            'services.facebook.graph_version' => 'v25.0',
        ]);

        Http::fake([
            'https://graph.facebook.com/*' => Http::response(['events_received' => 1], 200),
        ]);

        $webhookRequest = Request::create(
            'https://mercasto.com/api/webhooks/clip',
            'POST',
            [],
            [],
            [],
            [
                'REMOTE_ADDR' => '192.0.2.10',
                'HTTP_USER_AGENT' => 'Clip Webhook',
            ]
        );

        $result = app(MetaCapiService::class)->send(
            'Purchase',
            $webhookRequest,
            (object) [
                'id' => 42,
                'email' => 'buyer@example.com',
                'phone' => '+52 229 123 4567',
            ],
            [
                'currency' => 'MXN',
                'value' => 99.0,
                'order_id' => 'clip-order-42',
                'content_ids' => ['package_impulso'],
            ],
            'purchase_clip_42',
            'https://mercasto.com/?payment=success',
            [
                'client_ip_address' => '198.51.100.24',
                'client_user_agent' => 'Buyer Browser',
                'fbp' => 'fb.1.123.456',
                'fbc' => 'fb.1.123.click',
            ]
        );

        $this->assertTrue($result['ok']);

        Http::assertSent(function (ClientRequest $request): bool {
            $event = $request->data()['data'][0] ?? [];

            return $request->url() === 'https://graph.facebook.com/v25.0/123456789/events'
                && ($event['event_name'] ?? null) === 'Purchase'
                && ($event['event_id'] ?? null) === 'purchase_clip_42'
                && ($event['action_source'] ?? null) === 'website'
                && ($event['event_source_url'] ?? null) === 'https://mercasto.com/?payment=success'
                && ($event['custom_data']['currency'] ?? null) === 'MXN'
                && (float) ($event['custom_data']['value'] ?? 0) === 99.0
                && ($event['custom_data']['order_id'] ?? null) === 'clip-order-42'
                && ($event['user_data']['client_ip_address'] ?? null) === '198.51.100.24'
                && ($event['user_data']['client_user_agent'] ?? null) === 'Buyer Browser'
                && ($event['user_data']['fbp'] ?? null) === 'fb.1.123.456'
                && ($event['user_data']['fbc'] ?? null) === 'fb.1.123.click'
                && ($event['user_data']['em'][0] ?? null) === hash('sha256', 'buyer@example.com')
                && ($event['user_data']['external_id'][0] ?? null) === hash('sha256', '42');
        });
    }
}
