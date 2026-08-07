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

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
            'services.ollama.keep_alive' => '24h',
        ]);
    }

    public function test_route_requires_auth(): void
    {
        $route = collect(Route::getRoutes()->getRoutes())->first(
            fn ($route) => $route->uri() === 'api/ads/generate-description'
                && in_array('POST', $route->methods(), true)
        );
        $this->assertNotNull($route);
        $this->assertSame(AiDescriptionController::class, $route->getActionName());
        $this->postJson('/api/ads/generate-description', ['title' => 'Bicicleta urbana'])->assertUnauthorized();
    }

    public function test_authenticated_request_uses_only_local_ollama(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'Bicicleta urbana usada en Veracruz por $2,500 MXN. Escríbeme para más información.',
                ],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $this->payload());

        $response->assertOk()->assertJsonPath(
            'description',
            'Bicicleta urbana usada en Veracruz por $2,500 MXN. Escríbeme para más información.'
        );

        Http::assertSent(fn (Request $request) => $request->url() === 'http://ollama.test/api/chat'
            && $request['keep_alive'] === '24h');
        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'googleapis.com')
            || str_contains($request->url(), 'deepseek')
            || str_contains($request->url(), 'anthropic'));
    }

    public function test_requested_locale_is_forced_in_local_ai_system_prompt(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'Продаю городской велосипед в Веракрусе за 2 500 MXN. Напишите для подробностей.',
                ],
            ]),
        ]);

        $payload = $this->payload();
        $payload['locale'] = 'ru-RU';

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $payload);

        $response->assertOk()->assertJsonPath(
            'description',
            'Продаю городской велосипед в Веракрусе за 2 500 MXN. Напишите для подробностей.'
        );

        Http::assertSent(function (Request $request) {
            if ($request->url() !== 'http://ollama.test/api/chat') {
                return false;
            }

            $messages = $request['messages'] ?? [];
            $system = collect($messages)->firstWhere('role', 'system')['content'] ?? '';

            return str_contains($system, 'Respond only in Russian')
                && str_contains($system, 'Use ONLY facts explicitly confirmed by the user');
        });
    }

    public function test_accept_language_is_used_when_locale_is_not_sent(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => [
                    'role' => 'assistant',
                    'content' => 'Selling an urban bicycle in Veracruz for $2,500 MXN. Message me for details.',
                ],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->withHeader('Accept-Language', 'en-US,en;q=0.9')
            ->postJson('/api/ads/generate-description', $this->payload());

        $response->assertOk();

        Http::assertSent(function (Request $request) {
            $messages = $request['messages'] ?? [];
            $system = collect($messages)->firstWhere('role', 'system')['content'] ?? '';

            return str_contains($system, 'Respond only in English');
        });
    }

    public function test_unsupported_local_ai_claims_fall_back_to_safe_facts(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => ['role' => 'assistant', 'content' => 'Bicicleta con motor de gasolina, garantía y entrega incluida.'],
            ]),
        ]);

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $this->payload());

        $response->assertOk();
        $description = mb_strtolower((string) $response->json('description'));
        $this->assertStringContainsString('bicicleta urbana', $description);
        $this->assertStringContainsString('veracruz', $description);
        $this->assertStringNotContainsString('garantía', $description);
        $this->assertStringNotContainsString('entrega', $description);
        $this->assertStringNotContainsString('gasolina', $description);
    }

    public function test_localized_fallback_stays_in_requested_language(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => ['role' => 'assistant', 'content' => 'Bicicleta con garantía y entrega incluida.'],
            ]),
        ]);

        $payload = $this->payload();
        $payload['locale'] = 'en';

        $response = $this->actingAs(User::factory()->create(), 'sanctum')
            ->postJson('/api/ads/generate-description', $payload);

        $response->assertOk();
        $description = (string) $response->json('description');
        $this->assertStringContainsString('Selling Bicicleta urbana on Mercasto.', $description);
        $this->assertStringContainsString('Available in Veracruz.', $description);
        $this->assertStringNotContainsString('garantía', mb_strtolower($description));
        $this->assertStringNotContainsString('entrega', mb_strtolower($description));
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
