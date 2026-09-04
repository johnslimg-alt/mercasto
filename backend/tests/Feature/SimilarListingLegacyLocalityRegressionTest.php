<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SimilarListingLegacyLocalityRegressionTest extends TestCase
{
    use RefreshDatabase;

    public function test_same_named_city_and_state_do_not_admit_other_city_from_legacy_location(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 1,
        ]);

        $source = $this->ad([
            'city' => 'Puebla',
            'state' => 'Puebla',
            'location' => 'Puebla, Puebla',
        ]);
        $sameCity = $this->ad([
            'title' => 'Puebla exacta',
            'city' => null,
            'state' => null,
            'location' => 'Puebla, Puebla',
            'created_at' => now()->subMinute(),
        ]);
        $otherCity = $this->ad([
            'title' => 'Cholula no es Puebla',
            'city' => null,
            'state' => null,
            'location' => 'Cholula, Puebla',
            'created_at' => now(),
        ]);

        $ids = collect($this->getJson("/api/ads/{$source->id}/similar")->assertOk()->json())
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        $this->assertSame([$sameCity->id], $ids);
        $this->assertNotContains($otherCity->id, $ids);
    }

    private function ad(array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => User::factory()->create()->id,
            'title' => 'Anuncio similar',
            'description' => 'Descripción segura',
            'price' => 10000,
            'location' => 'Puebla, Puebla',
            'state' => 'Puebla',
            'city' => 'Puebla',
            'category' => 'hogar',
            'condition' => 'used',
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => false,
            'expires_at' => now()->addDays(3),
        ], $overrides));
    }
}
