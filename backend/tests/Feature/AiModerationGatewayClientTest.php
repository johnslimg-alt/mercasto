<?php

namespace Tests\Feature;

use App\Services\AiModerationGatewayClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class AiModerationGatewayClientTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.ai_moderation_gateway.url' => 'http://ai-gateway.test',
            'services.ai_moderation_gateway.token' => 'internal-test-token',
        ]);
    }

    public function test_listing_request_is_authenticated_bounded_and_private(): void
    {
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'manual_review', 'reason' => 'Revisión humana.', 'confidence' => 0.7,
                'flags' => [], 'provider' => 'ollama', 'model' => 'qwen3-vl:test',
                'runtime' => 'private_local', 'gateway_version' => '0.2.0', 'latency_ms' => 12,
                'rollout_mode' => 'shadow_assist', 'authoritative' => false,
            ]),
        ]);

        $result = app(AiModerationGatewayClient::class)->moderateListing(
            title: str_repeat('T', 300),
            description: str_repeat('D', 13000),
            imagesBase64: ['a-valid-image-payload-1', 'a-valid-image-payload-2', 'a-valid-image-payload-3'],
            sourceImageCount: 3,
            policySignals: ['weapons_firearms', 'weapons_firearms', 'fraud_scam'],
            timeoutSeconds: 90,
        );

        $this->assertSame('private_local', $result['runtime']);
        Http::assertSent(function (Request $request): bool {
            return $request->url() === 'http://ai-gateway.test/v1/moderation/listing'
                && $request->hasHeader('X-Mercasto-Internal-Token', 'internal-test-token')
                && mb_strlen((string) $request['title']) === 255
                && mb_strlen((string) $request['description']) === 12000
                && (int) $request['source_description_chars'] === 13000
                && count((array) $request['images_base64']) === 2
                && (int) $request['source_image_count'] === 3
                && $request['policy_signals'] === ['weapons_firearms', 'fraud_scam'];
        });
    }

    public function test_external_gateway_host_is_rejected_before_http(): void
    {
        config(['services.ai_moderation_gateway.url' => 'https://api.example.com']);
        Http::fake();

        $this->expectException(RuntimeException::class);
        app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], 0, ['fraud_scam'], 60);
    }

    public function test_missing_internal_credential_fails_closed(): void
    {
        config(['services.ai_moderation_gateway.token' => '']);
        $this->expectException(RuntimeException::class);
        app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], 0, ['fraud_scam'], 60);
    }

    public function test_non_assist_gateway_contract_is_rejected(): void
    {
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'approved', 'reason' => 'x', 'confidence' => 1,
                'flags' => [], 'provider' => 'ollama', 'model' => 'qwen3-vl:test',
                'runtime' => 'private_local', 'gateway_version' => '0.2.0',
                'rollout_mode' => 'shadow_assist', 'authoritative' => true,
            ]),
        ]);

        $this->expectException(RuntimeException::class);
        app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], 0, ['fraud_scam'], 60);
    }
}
