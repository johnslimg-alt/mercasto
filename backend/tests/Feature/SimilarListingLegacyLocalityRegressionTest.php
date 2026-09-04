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

        $ids = $this->similarIds($source);

        $this->assertSame([$sameCity->id], $ids);
        $this->assertNotContains($otherCity->id, $ids);
    }

    public function test_cdmx_alias_matches_canonical_state_in_city_tier(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 1,
        ]);

        $source = $this->ad([
            'city' => 'Coyoacán',
            'state' => 'Ciudad de México',
            'location' => 'Coyoacán, Ciudad de México',
        ]);
        $sameCity = $this->ad([
            'title' => 'Coyoacán legacy',
            'city' => null,
            'state' => null,
            'location' => 'Coyoacán, CDMX',
            'created_at' => now()->subMinute(),
        ]);
        $this->ad([
            'title' => 'Otra alcaldía más nueva',
            'city' => null,
            'state' => null,
            'location' => 'Iztapalapa, CDMX',
            'created_at' => now(),
        ]);

        $this->assertSame([$sameCity->id], $this->similarIds($source));
    }

    public function test_state_like_metacharacters_are_matched_literally(): void
    {
        config([
            'semantic_discovery.enabled' => false,
            'semantic_discovery.similar.limit' => 1,
        ]);

        $source = $this->ad([
            'city' => null,
            'state' => 'Ver%acruz_1',
            'location' => 'Origen, Ver%acruz_1',
        ]);
        $literal = $this->ad([
            'title' => 'Estado literal',
            'city' => null,
            'state' => null,
            'location' => 'Destino, Ver%acruz_1',
            'created_at' => now()->subMinute(),
        ]);
        $wildcardLookalike = $this->ad([
            'title' => 'No debe entrar por wildcard',
            'city' => null,
            'state' => null,
            'location' => 'Destino, VerZZacruzX1',
            'created_at' => now(),
        ]);

        $ids = $this->similarIds($source);

        $this->assertSame([$literal->id], $ids);
        $this->assertNotContains($wildcardLookalike->id, $ids);
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
