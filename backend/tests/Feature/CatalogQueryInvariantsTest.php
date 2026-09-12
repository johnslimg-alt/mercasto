<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Behavioural coverage for the PUBLIC catalog query path: GET /api/ads.
 *
 * These invariants used to be "covered" only by shell gates that grepped
 * `Api/AdController.php` for filter literals such as
 * `where('ads.status', 'active')`, `filled('min_price')` and
 * `location ILIKE ? OR state ILIKE ?`.
 *
 * `AdController@index` is unreachable: `routes/api.php` maps GET /ads to
 * `AdIndexController@index`, which delegates filtering to
 * `App\Support\AdQueryFilters`. The filters were re-implemented there long ago
 * (case-insensitive `LOWER(...) LIKE LOWER(?)` instead of Postgres `ILIKE`,
 * `price_min`/`price_max` alongside the legacy `min_price`/`max_price`), so the
 * gates kept passing against dead text while the live query path was never
 * asserted at all.
 *
 * Asserting through the routed endpoint is the only check that fails when the
 * live filter breaks, regardless of which class or SQL dialect implements it.
 */
class CatalogQueryInvariantsTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_catalog_returns_only_active_listings(): void
    {
        Http::preventStrayRequests();

        $active = $this->listing(['title' => 'Bicicleta activa']);
        $archived = $this->listing(['title' => 'Bicicleta archivada', 'status' => 'archived']);
        $pending = $this->listing(['title' => 'Bicicleta pendiente', 'status' => 'pending']);

        $response = $this->getJson('/api/ads');

        $response->assertOk()->assertJsonPath('total', 1);
        $this->assertSame(
            [$active->id],
            array_column($response->json('data'), 'id'),
            'only active listings may appear in the public catalog'
        );
        $this->assertNotContains($archived->id, array_column($response->json('data'), 'id'));
        $this->assertNotContains($pending->id, array_column($response->json('data'), 'id'));
    }

    public function test_price_range_filters_bound_the_returned_inventory(): void
    {
        Http::preventStrayRequests();

        $cheap = $this->listing(['title' => 'Barato', 'price' => 500]);
        $mid = $this->listing(['title' => 'Medio', 'price' => 5000]);
        $expensive = $this->listing(['title' => 'Caro', 'price' => 90000]);

        $this->getJson('/api/ads?min_price=1000&max_price=10000')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $mid->id);

        // The live query accepts the canonical price_min/price_max aliases too.
        $this->getJson('/api/ads?price_min=1000&price_max=10000')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.id', $mid->id);

        $this->getJson('/api/ads?min_price=1000')
            ->assertOk()
            ->assertJsonPath('total', 2);

        $this->assertNotSame($cheap->id, $expensive->id);
    }

    public function test_condition_filter_returns_only_matching_listings(): void
    {
        Http::preventStrayRequests();

        $used = $this->listing(['title' => 'Usado', 'condition' => 'used']);
        $new = $this->listing(['title' => 'Nuevo', 'condition' => 'new']);

        $response = $this->getJson('/api/ads?condition=used');

        $response->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $used->id);
        $this->assertNotContains($new->id, array_column($response->json('data'), 'id'));
    }

    public function test_city_filter_returns_only_listings_in_that_city(): void
    {
        Http::preventStrayRequests();

        // The live query matches the city against the `location` column, which is
        // where the publish flow stores the combined "City, State" label.
        $xalapa = $this->listing(['title' => 'Casa en Xalapa']);
        $xalapa->forceFill(['location' => 'Xalapa, Veracruz', 'city' => 'Xalapa', 'state' => 'Veracruz'])->saveQuietly();
        $merida = $this->listing(['title' => 'Casa en Mérida']);
        $merida->forceFill(['location' => 'Mérida, Yucatán', 'city' => 'Mérida', 'state' => 'Yucatán'])->saveQuietly();

        $response = $this->getJson('/api/ads?city=Xalapa');

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($xalapa->id, $ids, 'a listing located in the searched city must be returned');
        $this->assertNotContains($merida->id, $ids, 'a listing in another city must not be returned');
    }

    public function test_state_filter_returns_only_listings_in_that_state(): void
    {
        Http::preventStrayRequests();

        $veracruz = $this->listing(['title' => 'Casa en Veracruz']);
        $veracruz->forceFill(['location' => 'Xalapa, Veracruz', 'state' => 'Veracruz'])->saveQuietly();
        $jalisco = $this->listing(['title' => 'Casa en Jalisco']);
        $jalisco->forceFill(['location' => 'Guadalajara, Jalisco', 'state' => 'Jalisco'])->saveQuietly();

        $response = $this->getJson('/api/ads?state=veracruz');

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($veracruz->id, $ids, 'state matching must be case-insensitive');
        $this->assertNotContains($jalisco->id, $ids, 'a listing in another state must not be returned');
    }

    public function test_attribute_filter_is_applied_through_the_json_attributes_column(): void
    {
        Http::preventStrayRequests();

        $withWarranty = $this->listing(['title' => 'Con garantía']);
        $withWarranty->forceFill(['attributes' => ['warranty' => 'yes']])->saveQuietly();
        $without = $this->listing(['title' => 'Sin garantía']);
        $without->forceFill(['attributes' => ['warranty' => 'no']])->saveQuietly();

        $response = $this->getJson('/api/ads?filters[warranty][]=yes');

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($withWarranty->id, $ids, 'the matching attribute value must be returned');
        $this->assertNotContains($without->id, $ids, 'a non-matching attribute value must be filtered out');
    }

    public function test_offset_pagination_has_a_stable_total_order(): void
    {
        Http::preventStrayRequests();

        // Identical timestamps and prices: without a unique tie-breaker the two
        // pages can repeat or omit rows.
        for ($i = 0; $i < 20; $i++) {
            $this->listing(['title' => "Anuncio {$i}", 'price' => 1000, 'created_at' => '2026-01-01 10:00:00']);
        }

        $first = array_column($this->getJson('/api/ads?page=1')->assertOk()->json('data'), 'id');
        $second = array_column($this->getJson('/api/ads?page=2')->assertOk()->json('data'), 'id');

        $this->assertCount(16, $first);
        $this->assertCount(4, $second);
        $this->assertSame([], array_intersect($first, $second), 'pages must not repeat rows');
        $this->assertCount(20, array_unique(array_merge($first, $second)), 'every row must appear exactly once');
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function listing(array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => User::factory()->create()->id,
            'title' => 'Anuncio de prueba',
            'description' => 'Descripción de prueba para el catálogo público.',
            'price' => 2500,
            'location' => 'Veracruz',
            'category' => 'general',
            'condition' => 'used',
            'status' => 'active',
            'is_catalog_filler' => false,
        ], $overrides));
    }
}
