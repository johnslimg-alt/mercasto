<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Services\AI\SemanticSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class SimilarDiscoveryFallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_similar_fallback_keeps_category_condition_price_and_visibility_constraints(): void
    {
        $seller = User::factory()->create();
        $source = $this->ad($seller, 'Fuente', 'electronics', 'usado', 1000);
        $valid = $this->ad($seller, 'Válido', 'electronics', 'usado', 1200);
        $this->ad($seller, 'Precio fuera', 'electronics', 'usado', 3000);
        $this->ad($seller, 'Categoría fuera', 'motor', 'usado', 1100);
        $this->ad($seller, 'Condición fuera', 'electronics', 'nuevo', 1100);
        $filler = $this->ad($seller, 'Catálogo', 'electronics', 'usado', 1100, true);
        $expired = $this->ad($seller, 'Expirado', 'electronics', 'usado', 1100);
        $expired->forceFill(['expires_at' => now()->subMinute()])->saveQuietly();

        $semantic = Mockery::mock(SemanticSearchService::class);
        $semantic->shouldReceive('findSimilar')->once()->andReturn([]);
        $this->app->instance(SemanticSearchService::class, $semantic);

        $response = $this->getJson("/api/ads/{$source->id}/similar");
        $response->assertOk();
        $ids = collect($response->json())->pluck('id')->all();

        $this->assertSame([$valid->id], $ids);
        $this->assertNotContains($filler->id, $ids);
        $this->assertNotContains($expired->id, $ids);
    }

    private function ad(
        User $seller,
        string $title,
        string $category,
        string $condition,
        float $price,
        bool $filler = false,
    ): Ad {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => $title,
            'description' => 'Descripción de prueba',
            'price' => $price,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => $category,
            'condition' => $condition,
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'expires_at' => now()->addDays(5),
        ]);
    }
}
