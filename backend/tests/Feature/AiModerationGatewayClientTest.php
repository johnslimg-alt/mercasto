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

    private function executedResponse(array $overrides = []): array
    {
        return array_merge([
            'decision' => 'manual_review', 'reason' => 'Revisión humana.', 'confidence' => 0.7,
            'flags' => [], 'provider' => 'ollama', 'model' => 'qwen3-vl:test',
            'runtime' => 'private_local', 'model_executed' => true,
            'gateway_version' => '0.2.0', 'latency_ms' => 12,
            'rollout_mode' => 'shadow_assist', 'authoritative' => false,
        ], $overrides);
    }

    public function test_listing_request_is_authenticated_bounded_and_private(): void
    {
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response($this->executedResponse()),
        ]);

        $result = app(AiModerationGatewayClient::class)->moderateListing(
            title: str_repeat('T', 300),
            description: str_repeat('D', 13000),
            structuredContext: [
                'category' => 'autos', 'subcategory' => 'sedanes', 'price' => 125000,
                'location' => 'Veracruz, Veracruz', 'state' => 'Veracruz', 'city' => 'Veracruz',
                'condition' => 'usado', 'attributes' => ['transmission' => 'automatic'],
            ],
            imagesBase64: ['a-valid-image-payload-1', 'a-valid-image-payload-2', 'a-valid-image-payload-3'],
            sourceImageCount: 3,
            policySignals: ['weapons_firearms', 'weapons_firearms', 'fraud_scam'],
        );

        $this->assertSame('private_local', $result['runtime']);
        $this->assertTrue($result['model_executed']);
        Http::assertSent(function (Request $request): bool {
            return $request->url() === 'http://ai-gateway.test/v1/moderation/listing'
                && $request->hasHeader('X-Mercasto-Internal-Token', 'internal-test-token')
                && mb_strlen((string) $request['title']) === 255
                && mb_strlen((string) $request['description']) === 12000
                && (int) $request['source_description_chars'] === 13000
                && $request['structured_context']['category'] === 'autos'
                && $request['structured_context']['subcategory'] === 'sedanes'
                && $request['structured_context']['price'] === '125000'
                && str_contains((string) $request['structured_context']['attributes_json'], 'automatic')
                && count((array) $request['images_base64']) === 2
                && (int) $request['source_image_count'] === 3
                && $request['policy_signals'] === ['weapons_firearms', 'fraud_scam'];
        });
    }

    public function test_media_provenance_preserves_all_thirteen_prepared_items(): void
    {
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response($this->executedResponse()),
        ]);
        $media = array_map(fn (int $index) => "frame-{$index}", range(1, 13));

        app(AiModerationGatewayClient::class)->moderateListing(
            'x', 'y', [], $media, 11, ['fraud_scam']
        );

        Http::assertSent(fn (Request $request): bool => count((array) $request['images_base64']) === 2
            && (int) $request['source_image_count'] === 13);
    }

    public function test_skipped_model_contract_is_explicit_and_has_no_model_identity(): void
    {
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response([
                'decision' => 'manual_review', 'reason' => 'Contexto fuera del límite.', 'confidence' => 0,
                'flags' => [], 'provider' => 'none', 'model' => null, 'runtime' => 'skipped',
                'model_executed' => false, 'gateway_version' => '0.2.0', 'latency_ms' => 0,
                'rollout_mode' => 'shadow_assist', 'authoritative' => false,
            ]),
        ]);

        $result = app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], [], 0, ['fraud_scam']);

        $this->assertFalse($result['model_executed']);
        $this->assertSame('none', $result['provider']);
        $this->assertNull($result['model']);
        $this->assertSame('skipped', $result['runtime']);
    }

    public function test_gateway_contract_requires_numeric_latency(): void
    {
        $response = $this->executedResponse();
        unset($response['latency_ms']);
        Http::fake(['http://ai-gateway.test/v1/moderation/listing' => Http::response($response)]);

        $this->expectException(RuntimeException::class);
        app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], [], 0, ['fraud_scam']);
    }

    public function test_external_gateway_host_is_rejected_before_http(): void
    {
        config(['services.ai_moderation_gateway.url' => 'https://api.example.com']);
        Http::fake();

        $this->expectException(RuntimeException::class);
        app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], [], 0, ['fraud_scam']);
    }

    public function test_missing_internal_credential_fails_closed(): void
    {
        config(['services.ai_moderation_gateway.token' => '']);
        $this->expectException(RuntimeException::class);
        app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], [], 0, ['fraud_scam']);
    }

    public function test_non_assist_gateway_contract_is_rejected(): void
    {
        Http::fake([
            'http://ai-gateway.test/v1/moderation/listing' => Http::response($this->executedResponse([
                'decision' => 'approved', 'confidence' => 1, 'authoritative' => true,
            ])),
        ]);

        $this->expectException(RuntimeException::class);
        app(AiModerationGatewayClient::class)->moderateListing('x', 'y', [], [], 0, ['fraud_scam']);
    }

    public function test_gateway_timeout_is_read_from_dedicated_config_not_runtime_argument(): void
    {
        $source = file_get_contents(app_path('Services/AiModerationGatewayClient.php'));
        $this->assertStringContainsString("config('services.ai_moderation_gateway.timeout', 150)", $source);
        $this->assertStringContainsString('->timeout($timeoutSeconds)', $source);

        $method = new \ReflectionMethod(AiModerationGatewayClient::class, 'moderateListing');
        $parameterNames = array_map(fn ($parameter) => $parameter->getName(), $method->getParameters());
        $this->assertNotContains('timeoutSeconds', $parameterNames);
    }
}
