<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\AdController;
use App\Http\Controllers\Api\ConstrainedSimilarAdController;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConstrainedSimilarListingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_ad_controller_resolves_to_constrained_similar_controller(): void
    {
        $this->assertInstanceOf(ConstrainedSimilarAdController::class, app(AdController::class));
    }

    public function test_similar_results_keep_category_price_condition_and_public_inventory_constraints(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 8,
            'semantic_discovery.similar.price_min_ratio' => 0.5,
            'semantic_discovery.similar.price_max_ratio' => 1.75,
        ]);

        $source = $this->ad([
            'title' => 'Toyota Corolla origen',
            'price' => 200000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
        ]);
        $city = $this->ad([
            'title' => 'Toyota Corolla local',
            'price' => 210000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
        ]);
        $state = $this->ad([
            'title' => 'Toyota Corolla estatal',
            'price' => 190000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Xalapa',
        ]);
        $remote = $this->ad([
            'title' => 'Toyota Corolla nacional',
            'price' => 220000,
            'category' => 'motor',
            'condition' => 'used',
            'state' => 'Puebla',
            'city' => 'Puebla',
        ]);

        $excluded = [
            $this->ad(['category' => 'electronica']),
            $this->ad(['category' => 'motor', 'condition' => 'new']),
            $this->ad(['category' => 'motor', 'price' => 50000]),
            $this->ad(['category' => 'motor', 'price' => 500000]),
            $this->ad(['category' => 'motor', 'is_catalog_filler' => true]),
            $this->ad(['category' => 'motor', 'status' => 'rejected']),
            $this->ad(['category' => 'motor', 'expires_at' => now()->subMinute()]),
        ];

        $response = $this->getJson("/api/ads/{$source->id}/similar");
        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->map(fn ($id): int => (int) $id)->all();

        $this->assertSame([$city->id, $state->id, $remote->id], $ids);
        foreach ($excluded as $ad) {
            $this->assertNotContains($ad->id, $ids);
        }
    }

    public function test_state_is_prioritized_when_source_city_is_missing(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 1,
        ]);

        $source = $this->ad(['state' => 'Veracruz', 'city' => null]);
        $state = $this->ad(['title' => 'Mismo estado', 'state' => 'Veracruz', 'city' => 'Xalapa']);
        $this->ad(['title' => 'Más reciente remoto', 'state' => 'Puebla', 'city' => 'Puebla']);

        $ids = collect($this->getJson("/api/ads/{$source->id}/similar")->assertOk()->json())
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $this->assertSame([$state->id], $ids);
    }

    public function test_deterministic_fallback_uses_id_as_stable_timestamp_tie_breaker(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 2,
        ]);
        $this->travelTo(now()->startOfSecond());

        $source = $this->ad();
        $first = $this->ad(['title' => 'Primero']);
        $second = $this->ad(['title' => 'Segundo']);

        $ids = collect($this->getJson("/api/ads/{$source->id}/similar")->assertOk()->json())
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $this->assertSame([$second->id, $first->id], $ids);
    }

    public function test_semantic_query_keeps_vector_distance_as_leading_order_inside_locality_tiers(): void
    {
        $source = file_get_contents(app_path('Services/AI/SimilarListingService.php'));
        $this->assertIsString($source);
        $semanticStart = strpos($source, 'private function semanticTier');
        $deterministicStart = strpos($source, 'private function deterministicTier');
        $this->assertNotFalse($semanticStart);
        $this->assertNotFalse($deterministicStart);

        $semanticBody = substr($source, $semanticStart, $deterministicStart - $semanticStart);
        $vectorOrder = strpos($semanticBody, "->orderBy('vec_distance')");
        $recencyOrder = strpos($semanticBody, "->orderByDesc('ads.created_at')");

        $this->assertNotFalse($vectorOrder);
        $this->assertNotFalse($recencyOrder);
        $this->assertLessThan($recencyOrder, $vectorOrder);
        $this->assertStringNotContainsString("orderByRaw('CASE", $semanticBody);
    }

    public function test_similar_endpoint_is_bounded_and_never_returns_source(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 8,
        ]);

        $source = $this->ad(['category' => 'motor', 'price' => 100000, 'condition' => 'used']);
        for ($index = 0; $index < 12; $index++) {
            $this->ad([
                'title' => 'Vehículo '.$index,
                'category' => 'motor',
                'price' => 100000 + $index,
                'condition' => 'used',
            ]);
        }

        $response = $this->getJson("/api/ads/{$source->id}/similar");
        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->map(fn ($id): int => (int) $id)->all();

        $this->assertCount(8, $ids);
        $this->assertNotContains($source->id, $ids);
    }

    public function test_missing_vector_uses_deterministic_locality_fallback_without_persistence(): void
    {
        config(['semantic_discovery.enabled' => true]);

        $source = $this->ad([
            'category' => 'hogar',
            'price' => 10000,
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
        ]);
        $local = $this->ad([
            'category' => 'hogar',
            'price' => 11000,
            'condition' => 'used',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
        ]);
        $remote = $this->ad([
            'category' => 'hogar',
            'price' => 9000,
            'condition' => 'used',
            'state' => 'Yucatán',
            'city' => 'Mérida',
        ]);

        $before = $source->fresh()->toArray();
        $response = $this->getJson("/api/ads/{$source->id}/similar");
        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->map(fn ($id): int => (int) $id)->all();

        $this->assertSame([$local->id, $remote->id], $ids);
        $this->assertSame($before, $source->fresh()->toArray());
    }

    private function ad(array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => User::factory()->create()->id,
            'title' => 'Anuncio similar',
            'description' => 'Descripción segura',
            'price' => 200000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
            'category' => 'motor',
            'condition' => 'used',
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => false,
            'expires_at' => now()->addDays(3),
        ], $overrides));
    }
}
