<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\HybridSearchController;
use App\Http\Controllers\Api\SearchController;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SemanticDiscoveryShadowTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_controller_resolves_to_exact_first_hybrid_controller(): void
    {
        $this->assertInstanceOf(HybridSearchController::class, app(SearchController::class));
    }

    public function test_exact_search_honors_filters_and_excludes_catalog_fillers_without_ai_call(): void
    {
        Http::preventStrayRequests();

        $matching = $this->ad([
            'title' => 'Toyota Corolla Veracruz',
            'price' => 180000,
            'category' => 'motor',
            'state' => 'Veracruz',
            'condition' => 'used',
        ]);
        $this->ad([
            'title' => 'Toyota Corolla Puebla',
            'price' => 180000,
            'category' => 'motor',
            'state' => 'Puebla',
            'condition' => 'used',
        ]);
        $this->ad([
            'title' => 'Toyota Corolla catálogo',
            'price' => 180000,
            'category' => 'motor',
            'state' => 'Veracruz',
            'condition' => 'used',
            'is_catalog_filler' => true,
        ]);

        $response = $this->getJson(
            '/api/search/semantic?q=Toyota&category=motor&state=Veracruz&min_price=150000&max_price=200000&condition=used'
        );

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $matching->id)
            ->assertJsonPath('discovery.mode', 'exact')
            ->assertJsonPath('discovery.exact_first', true)
            ->assertJsonPath('discovery.semantic_authoritative', false);

        Http::assertNothingSent();
    }

    public function test_semantic_kill_switch_keeps_deterministic_empty_fallback(): void
    {
        config(['semantic_discovery.enabled' => false]);
        Http::preventStrayRequests();
        $this->ad(['title' => 'Bicicleta urbana']);

        $response = $this->getJson('/api/search/semantic?q=astronauta');

        $response->assertOk()
            ->assertJsonPath('total', 0)
            ->assertJsonPath('discovery.mode', 'deterministic_empty')
            ->assertJsonPath('discovery.semantic_enabled', false)
            ->assertJsonPath('discovery.semantic_authoritative', false);

        Http::assertNothingSent();
    }

    public function test_exact_match_is_not_replaced_when_semantic_feature_is_enabled(): void
    {
        config(['semantic_discovery.enabled' => true]);
        Http::preventStrayRequests();
        $known = $this->ad(['title' => 'PlayStation 5 Slim']);
        $this->ad(['title' => 'Consola retro']);

        $response = $this->getJson('/api/search/semantic?q=PlayStation%205%20Slim');

        $response->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $known->id)
            ->assertJsonPath('discovery.mode', 'exact');

        Http::assertNothingSent();
    }

    private function ad(array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => User::factory()->create()->id,
            'title' => 'Anuncio de prueba',
            'description' => 'Descripción segura',
            'price' => 2500,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'used',
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => false,
        ], $overrides));
    }
}
