<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AiDescriptionController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AiDescriptionFallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_description_route_uses_the_dedicated_controller_and_requires_auth(): void
    {
        $route = collect(Route::getRoutes()->getRoutes())->first(
            fn ($route) => $route->uri() === 'api/ads/generate-description'
                && in_array('POST', $route->methods(), true)
        );

        $this->assertNotNull($route);
        $this->assertSame(AiDescriptionController::class, $route->getActionName());

        $this->postJson('/api/ads/generate-description', [
            'title' => 'Bicicleta urbana',
        ])->assertUnauthorized();
    }

    public function test_authenticated_request_returns_deepseek_description(): void
    {
        $this->configureProviders();
        Http::fake([
            'https://deepseek.test/chat/completions' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => 'Bicicleta urbana usada, disponible en Veracruz. Escríbeme para conocer más detalles.',
                    ],
                ]],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $this->payload());

        $response->assertOk()
            ->assertJsonPath(
                'description',
                'Bicicleta urbana usada, disponible en Veracruz. Escríbeme para conocer más detalles.'
            );

        Http::assertSent(fn (Request $request) => $request->url() === 'https://deepseek.test/chat/completions');
        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'ollama:11434'));
    }

    public function test_deepseek_client_uses_ollama_chat_fallback_for_the_authenticated_route(): void
    {
        $this->configureProviders();
        Http::fake(function (Request $request) {
            return match ($request->url()) {
                'https://deepseek.test/chat/completions' => Http::response(['error' => 'unavailable'], 503),
                'http://ollama:11434/api/chat' => Http::response([
                    'model' => 'qwen2.5:1.5b',
                    'message' => [
                        'role' => 'assistant',
                        'content' => 'Bicicleta urbana usada por $2,500 MXN en Veracruz. Escríbeme para resolver dudas.',
                    ],
                ]),
                default => Http::response(['error' => 'unexpected URL'], 500),
            };
        });

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $this->payload());

        $response->assertOk()
            ->assertJsonPath(
                'description',
                'Bicicleta urbana usada por $2,500 MXN en Veracruz. Escríbeme para resolver dudas.'
            );

        Http::assertSent(fn (Request $request) => $request->url() === 'https://deepseek.test/chat/completions');
        Http::assertSent(function (Request $request) {
            return $request->url() === 'http://ollama:11434/api/chat'
                && $request['model'] === 'qwen2.5:1.5b'
                && $request['stream'] === false
                && data_get($request->data(), 'messages.1.content') !== null;
        });
        Http::assertNotSent(fn (Request $request) => $request->url() === 'http://ollama:11434/api/generate');
    }

    public function test_controller_uses_ollama_generate_when_deepseek_and_chat_fallback_fail(): void
    {
        $this->configureProviders();
        Http::fake(function (Request $request) {
            return match ($request->url()) {
                'https://deepseek.test/chat/completions' => Http::response(['error' => 'unavailable'], 503),
                'http://ollama:11434/api/chat' => Http::response(['error' => 'chat unavailable'], 503),
                'http://ollama:11434/api/generate' => Http::response([
                    'model' => 'qwen2.5:1.5b',
                    'response' => 'Bicicleta urbana usada en Veracruz por $2,500 MXN. Escríbeme para más información.',
                ]),
                default => Http::response(['error' => 'unexpected URL'], 500),
            };
        });

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $this->payload());

        $response->assertOk()
            ->assertJsonPath(
                'description',
                'Bicicleta urbana usada en Veracruz por $2,500 MXN. Escríbeme para más información.'
            );

        Http::assertSent(function (Request $request) {
            return $request->url() === 'http://ollama:11434/api/generate'
                && $request['model'] === 'qwen2.5:1.5b'
                && $request['stream'] === false
                && is_string($request['prompt']);
        });
    }

    public function test_unsupported_ollama_claims_are_replaced_with_a_safe_fact_only_description(): void
    {
        $this->configureProviders();
        Http::fake(function (Request $request) {
            return match ($request->url()) {
                'https://deepseek.test/chat/completions' => Http::response(['error' => 'unavailable'], 503),
                'http://ollama:11434/api/chat' => Http::response(['error' => 'chat unavailable'], 503),
                'http://ollama:11434/api/generate' => Http::response([
                    'model' => 'qwen2.5:1.5b',
                    'response' => 'Bicicleta negra original con garantía, caja y entrega incluida.',
                ]),
                default => Http::response(['error' => 'unexpected URL'], 500),
            };
        });

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $this->payload());

        $response->assertOk();
        $description = (string) $response->json('description');

        $this->assertStringContainsString('Bicicleta urbana', $description);
        $this->assertStringContainsString('$2,500 MXN', $description);
        $this->assertStringContainsString('Veracruz', $description);
        $this->assertStringNotContainsString('negra', mb_strtolower($description));
        $this->assertStringNotContainsString('original', mb_strtolower($description));
        $this->assertStringNotContainsString('garantía', mb_strtolower($description));
        $this->assertStringNotContainsString('caja', mb_strtolower($description));
        $this->assertStringNotContainsString('entrega', mb_strtolower($description));
    }

    private function configureProviders(): void
    {
        config([
            'services.deepseek.api_key' => 'test-key',
            'services.deepseek.base_url' => 'https://deepseek.test',
            'services.deepseek.fast_model' => 'deepseek-test',
            'services.ollama.base_url' => 'http://ollama:11434',
            'services.ollama.chat_model' => 'qwen2.5:1.5b',
        ]);
    }

    private function payload(): array
    {
        return [
            'title' => 'Bicicleta urbana',
            'category' => 'Bicicletas',
            'condition' => 'Usada',
            'location' => 'Veracruz',
            'price' => 2500,
        ];
    }
}
