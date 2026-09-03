<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\SemanticSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class HybridSemanticDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_exact_known_item_stays_first_and_filler_never_becomes_eligible(): void
    {
        $seller = User::factory()->create();
        $exact = $this->ad($seller, 'iPhone 15 Pro 256GB', false, false);
        $semantic = $this->ad($seller, 'Teléfono premium para fotografía', false, true);
        $filler = $this->ad($seller, 'iPhone 15 Pro catálogo', true, true);

        $service = Mockery::mock(SemanticSearchService::class);
        $service->shouldReceive('search')->once()->andReturn([
            'results' => collect([$semantic, $filler, $exact]),
            'fallback' => false,
        ]);
        $this->app->instance(SemanticSearchService::class, $service);

        $response = $this->getJson('/api/search/semantic?search=iphone');
        $response->assertOk()
            ->assertJsonPath('data.0.id', $exact->id)
            ->assertJsonPath('discovery.mode', 'hybrid_rrf')
            ->assertJsonPath('discovery.semantic_used', true);

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($filler->id, $ids);
        $this->assertContains($semantic->id, $ids);
    }

    public function test_semantic_outage_falls_back_to_keyword_results(): void
    {
        $seller = User::factory()->create();
        $exact = $this->ad($seller, 'Bicicleta urbana aluminio');

        $service = Mockery::mock(SemanticSearchService::class);
        $service->shouldReceive('search')->once()->andThrow(new \RuntimeException('gateway down'));
        $this->app->instance(SemanticSearchService::class, $service);

        $response = $this->getJson('/api/search/semantic?search=bicicleta');
        $response->assertOk()->assertJsonPath('data.0.id', $exact->id);
    }

    public function test_expired_semantic_candidate_is_removed_after_fusion(): void
    {
        $seller = User::factory()->create();
        $valid = $this->ad($seller, 'Laptop para trabajo');
        $expired = $this->ad($seller, 'Computadora portátil profesional');
        $expired->forceFill(['expires_at' => now()->subMinute()])->saveQuietly();

        $service = Mockery::mock(SemanticSearchService::class);
        $service->shouldReceive('search')->once()->andReturn([
            'results' => collect([$expired, $valid]),
            'fallback' => false,
        ]);
        $this->app->instance(SemanticSearchService::class, $service);

        $response = $this->getJson('/api/search/semantic?search=laptop');
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertNotContains($expired->id, $ids);
        $this->assertContains($valid->id, $ids);
    }

    private function ad(User $seller, string $title, bool $filler = false, bool $promoted = false): Ad
    {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => $title,
            'description' => 'Descripción suficientemente clara para una prueba de búsqueda.',
            'price' => 1000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'promoted' => $promoted ? 'destacado' : null,
            'boost_expires_at' => $promoted ? now()->addDay() : null,
            'expires_at' => now()->addDays(5),
        ]);
    }
}
