<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\HybridSearchService;
use App\Services\AI\SimilarListingService;
use App\Support\RelevanceMetrics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SemanticDiscoveryOfflineEvaluationTest extends TestCase
{
    use RefreshDatabase;

    public function test_exact_known_item_keeps_perfect_top_one_precision(): void
    {
        config(['semantic_discovery.enabled' => false]);
        $target = $this->ad(['title' => 'MacBook Pro M4 14 512GB']);
        $this->ad(['title' => 'MacBook Air M2 13 256GB']);

        $result = app(HybridSearchService::class)->search('MacBook Pro M4 14 512GB');
        $ranked = collect($result['paginator']->items())->pluck('id')->all();

        $this->assertSame('exact', $result['mode']);
        $this->assertSame(1.0, RelevanceMetrics::precisionAt($ranked, [$target->id], 1));
        $this->assertSame(1.0, RelevanceMetrics::recallAt($ranked, [$target->id], 1));
    }

    public function test_category_and_state_filters_preserve_relevant_inventory_only(): void
    {
        config(['semantic_discovery.enabled' => false]);
        $target = $this->ad([
            'title' => 'Silla ergonómica oficina',
            'category' => 'hogar',
            'state' => 'Veracruz',
        ]);
        $this->ad(['title' => 'Silla ergonómica oficina', 'category' => 'hogar', 'state' => 'Puebla']);
        $this->ad(['title' => 'Silla ergonómica oficina', 'category' => 'electronica', 'state' => 'Veracruz']);

        $result = app(HybridSearchService::class)->search('Silla ergonómica', [
            'category' => 'hogar',
            'state' => 'Veracruz',
        ]);
        $ranked = collect($result['paginator']->items())->pluck('id')->all();

        $this->assertSame([$target->id], array_map('intval', $ranked));
        $this->assertSame(1.0, RelevanceMetrics::precisionAt($ranked, [$target->id], 1));
    }

    public function test_similar_listing_keeps_local_compatible_item_at_rank_one(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 3,
        ]);
        $source = $this->ad([
            'title' => 'Sofá modular gris',
            'category' => 'hogar',
            'condition' => 'used',
            'price' => 12000,
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
            'location' => 'Boca del Río, Veracruz',
        ]);
        $local = $this->ad([
            'title' => 'Sofá seccional gris',
            'category' => 'hogar',
            'condition' => 'usado',
            'price' => 13000,
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
            'location' => 'Boca del Río, Veracruz',
            'created_at' => now()->subMinute(),
        ]);
        $this->ad([
            'title' => 'Sofá remoto',
            'category' => 'hogar',
            'condition' => 'used',
            'price' => 12500,
            'city' => 'Puebla',
            'state' => 'Puebla',
            'location' => 'Puebla, Puebla',
            'created_at' => now(),
        ]);
        $this->ad([
            'title' => 'Sofá nuevo incompatible',
            'category' => 'hogcasa',
            'condition' => 'new',
            'price' => 12500,
        ]);

        $ranked = app(SimilarListingService::class)->find($source)->pluck('id')->all();

        $this->assertSame($local->id, (int) ($ranked[0] ?? 0));
        $this->assertSame(1.0, RelevanceMetrics::precisionAt($ranked, [$local->id], 1));
        $this->assertSame(1.0, RelevanceMetrics::reciprocalRank($ranked, [$local->id]));
    }

    private function ad(array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => User::factory()->create()->id,
            'title' => 'Anuncio de evaluación',
            'description' => 'Inventario sintético para evaluación offline.',
            'price' => 10000,
            'location' => 'Boca del Río, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Boca del Río',
            'category' => 'hogar',
            'condition' => 'used',
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => false,
            'expires_at' => now()->addDays(3),
        ], $overrides));
    }
}
