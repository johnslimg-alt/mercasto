<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QueryLikeAndFilterSafetyTest extends TestCase
{
    use RefreshDatabase;

    private ?User $seller = null;

    public function test_catalog_search_treats_percent_and_underscore_as_literals(): void
    {
        $percent = $this->activeAd('Oferta 100% real', 'Precio especial.');
        $this->activeAd('Oferta 1000 real', 'No contiene porcentaje.');
        $underscore = $this->activeAd('Código A_B', 'Referencia literal.');
        $this->activeAd('Código A1B', 'No contiene guion bajo.');

        $this->getJson('/api/ads?search='.rawurlencode('100%'))
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $percent->id);

        $this->getJson('/api/ads?search='.rawurlencode('A_B'))
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $underscore->id);
    }

    public function test_location_filters_treat_like_metacharacters_as_literals(): void
    {
        $literal = $this->activeAd('Casa literal', 'Ubicación especial.');
        $literal->forceFill(['location' => 'Zona_1, Veracruz', 'state' => 'Veracruz', 'city' => 'Zona_1'])->saveQuietly();

        $other = $this->activeAd('Casa wildcard', 'Ubicación distinta.');
        $other->forceFill(['location' => 'ZonaX1, Veracruz', 'state' => 'Veracruz', 'city' => 'ZonaX1'])->saveQuietly();

        $this->getJson('/api/ads?city='.rawurlencode('Zona_1'))
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $literal->id);
    }

    public function test_unknown_category_filter_key_is_ignored_instead_of_becoming_json_path(): void
    {
        $first = $this->activeAd('Toyota uno', 'Filtro seguro.');
        $first->forceFill(['category' => 'motor', 'attributes' => ['marca' => 'Toyota']])->saveQuietly();
        $second = $this->activeAd('Honda dos', 'Filtro seguro.');
        $second->forceFill(['category' => 'motor', 'attributes' => ['marca' => 'Honda']])->saveQuietly();

        $response = $this->getJson('/api/ads?category=motor&'.http_build_query([
            'filters' => ['marca")) OR 1=1 --' => 'Toyota'],
        ]));

        $response->assertOk()->assertJsonPath('total', 2);
        $this->assertEqualsCanonicalizing(
            [$first->id, $second->id],
            collect($response->json('data'))->pluck('id')->all(),
        );
    }

    public function test_business_directory_search_treats_wildcards_as_literals(): void
    {
        $literal = User::factory()->create([
            'email' => 'query-safety-business-literal@example.test',
            'role' => 'business',
            'business_profile_enabled' => true,
            'business_name' => 'Tienda 50% real',
            'business_description' => 'Accesorios',
        ]);
        User::factory()->create([
            'email' => 'query-safety-business-control@example.test',
            'role' => 'business',
            'business_profile_enabled' => true,
            'business_name' => 'Tienda 500 real',
            'business_description' => 'Accesorios',
        ]);

        $this->getJson('/api/stores?search='.rawurlencode('50%'))
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $literal->id);
    }

    private function activeAd(string $title, string $description): Ad
    {
        $this->seller ??= User::factory()->create([
            'email' => 'query-safety-seller@example.test',
        ]);

        return Ad::query()->create([
            'user_id' => $this->seller->id,
            'title' => $title,
            'description' => $description,
            'price' => 2500,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'used',
            'attributes' => [],
            'status' => 'active',
            'is_catalog_filler' => false,
        ]);
    }
}
