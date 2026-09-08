<?php

namespace Tests\Feature;

use App\Services\OpenAiAdsCapiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenAiAdsCapiServiceTest extends TestCase
{
    public function test_it_sends_normalized_hashed_web_event_data(): void
    {
        config([
            'services.openai_ads.pixel_id' => 'px_mercasto_test',
            'services.openai_ads.api_key' => 'openai-capi-test-key',
            'services.openai_ads.events_api_endpoint' => 'https://bzr.openai.com/v1/events',
            'services.openai_ads.validate_only' => true,
            'app.frontend_url' => 'https://mercasto.com',
        ]);

        Http::fake([
            'bzr.openai.com/*' => Http::response(['accepted' => 1], 200),
        ]);

        $request = Request::create(
            '/api/test-openai-event',
            'POST',
            [],
            ['__oppref' => 'oppref%2Babc', '__obref' => 'obref%2F123'],
            [],            [
                'REMOTE_ADDR' => '203.0.113.9',
                'HTTP_USER_AGENT' => 'MercastoOpenAITest/1.0',
                'HTTP_REFERER' => 'https://mercasto.com/listing/42?utm_source=openai#done',
            ],
        );
        $user = (object) [
            'id' => 'ABC-42',
            'email' => ' Test@Example.com ',
            'phone' => '+52 229 123 4567',
        ];

        $result = app(OpenAiAdsCapiService::class)->send(
            'order_created',
            $request,
            $user,
            [
                'type' => 'contents',
                'amount' => 118000,
                'currency' => 'MXN',
                'contents' => [[
                    'id' => 'promotion_42',
                    'name' => 'Mercasto promotion',
                    'content_type' => 'product',
                    'quantity' => 1,
                ]],
            ],
            'order_shared_42'
        );

        $this->assertTrue($result['ok']);
        Http::assertSent(function ($sent) {
            $payload = $sent->data();
            $event = $payload['events'][0] ?? [];
            $user = $event['user'] ?? [];

            $this->assertSame('https://bzr.openai.com/v1/events?pid=px_mercasto_test', $sent->url());
            $this->assertSame('Bearer openai-capi-test-key', $sent->header('Authorization')[0] ?? null);
            $this->assertTrue($payload['validate_only'] ?? false);
            $this->assertSame('mercasto_web', $payload['integration_source'] ?? null);
            $this->assertSame('order_shared_42', $event['id'] ?? null);
            $this->assertSame('order_created', $event['type'] ?? null);
            $this->assertSame('web', $event['action_source'] ?? null);
            $this->assertSame('https://mercasto.com/listing/42', $event['source_url'] ?? null);
            $this->assertSame('oppref%2Babc', $event['oppref'] ?? null);
            $this->assertSame('obref%2F123', $user['obref'] ?? null);
            $this->assertSame(hash('sha256', 'test@example.com'), $user['emails_sha256'][0] ?? null);
            $this->assertSame(hash('sha256', '522291234567'), $user['phone_numbers_sha256'][0] ?? null);
            $this->assertSame(hash('sha256', 'ABC-42'), $user['external_ids_sha256'][0] ?? null);
            $this->assertSame('203.0.113.9', $user['ip_address'] ?? null);
            $this->assertSame('MercastoOpenAITest/1.0', $user['user_agent'] ?? null);

            $json = json_encode($payload);
            $this->assertStringNotContainsString('Test@Example.com', $json);
            $this->assertStringNotContainsString('+52 229 123 4567', $json);
            return true;
        });
    }
}
