<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SimilarListingPostMergeHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_condition_aliases_match_legacy_and_current_values(): void
    {
        config(['semantic_discovery.enabled' => false, 'semantic_discovery.similar.limit' => 4]);

        $source = $this->ad(['condition' => 'usado']);
        $legacyUsed = $this->ad(['title' => 'Legacy used', 'condition' => 'used']);
        $currentUsed = $this->ad(['title' => 'Current usado', 'condition' => 'usado']);
        $new = $this->ad(['title' => 'Nuevo incompatible', 'condition' => 'nuevo']);

        $ids = $this->similarIds($source);

        $this->assertContains($legacyUsed->id, $ids);
        $this->assertContains($currentUsed->id, $ids);
        $this->assertNotContains($new->id, $ids);
    }

    public function test_legacy_combined_location_preserves_locality_priority(): void
    {
        config(['semantic_discovery.enabled' => false, 'semantic_discovery.similar.limit' => 1]);

        $source = $this->ad([
            'city' => null,
            'state' => null,
            'location' => 'Xalapa, Veracruz',
        ]);
        $local = $this->ad([
            'title' => 'Local legacy',
            'city' => null,
            'state' => null,
            'location' => 'Xalapa, Veracruz',
            'created_at' => now()->subMinute(),
        ]);
        $this->ad([
            'title' => 'Remote newer',
            'city' => 'Puebla',
            'state' => 'Puebla',
            'location' => 'Puebla, Puebla',
            'created_at' => now(),
        ]);

        $this->assertSame([$local->id], $this->similarIds($source));
    }

    public function test_zero_price_source_does_not_recommend_paid_inventory(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 4,
            'semantic_discovery.similar.zero_price_max' => 0,
        ]);

        $source = $this->ad(['price' => 0]);
        $free = $this->ad(['title' => 'Free compatible', 'price' => 0]);
        $paid = $this->ad(['title' => 'Paid incompatible', 'price' => 50000]);

        $ids = $this->similarIds($source);

        $this->assertContains($free->id, $ids);
        $this->assertNotContains($paid->id, $ids);
    }

    public function test_filtered_hnsw_uses_iterative_scan_and_keeps_vector_order_first(): void
    {
        $source = file_get_contents(app_path('Services/AI/SimilarListingService.php'));
        $this->assertIsString($source);

        $semanticStart = strpos($source, 'private function semanticTier');
        $deterministicStart = strpos($source, 'private function deterministicTier');
        $this->assertNotFalse($semanticStart);
        $this->assertNotFalse($deterministicStart);

        $semantic = substr($source, $semanticStart, $deterministicStart - $semanticStart);
        $this->assertStringContainsString("SET LOCAL hnsw.iterative_scan = 'strict_order'", $semantic);
        $vectorOrder = strpos($semantic, "->orderBy('vec_distance')");
        $recencyOrder = strpos($semantic, "->orderByDesc('ads.created_at')");
        $this->assertNotFalse($vectorOrder);
        $this->assertNotFalse($recencyOrder);
        $this->assertLessThan($recencyOrder, $vectorOrder);
    }

    public function test_each_locality_tier_fills_vector_then_deterministic_before_widening(): void
    {
        $source = file_get_contents(app_path('Services/AI/SimilarListingService.php'));
        $this->assertIsString($source);

        $findStart = strpos($source, 'public function find');
        $embeddingStart = strpos($source, 'private function sourceEmbedding');
        $this->assertNotFalse($findStart);
        $this->assertNotFalse($embeddingStart);

        $find = substr($source, $findStart, $embeddingStart - $findStart);
        $loop = strpos($find, 'foreach ($this->localityTiers($source) as $locality)');
        $semantic = strpos($find, '$this->semanticTier');
        $deterministic = strpos($find, '$this->deterministicTier');
        $this->assertNotFalse($loop);
        $this->assertNotFalse($semantic);
        $this->assertNotFalse($deterministic);
        $this->assertLessThan($semantic, $loop);
        $this->assertLessThan($deterministic, $semantic);
    }

    private function similarIds(Ad $source): array
    {
        return collect($this->getJson("/api/ads/{$source->id}/similar")->assertOk()->json())
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
    }

    private function ad(array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => User::factory()->create()->id,
            'title' => 'Similar listing',
            'description' => 'Safe description',
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
