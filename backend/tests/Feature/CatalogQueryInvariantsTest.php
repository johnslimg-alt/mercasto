<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

    /**
     * The catalog's radius filter builds a Haversine expression with
     * `radians()`, `cos()`, `sin()`, `acos()`, `greatest()` and `least()`.
     * MySQL and Postgres provide those; a stock SQLite build does not (and only
     * provides the trig functions when compiled with
     * SQLITE_ENABLE_MATH_FUNCTIONS). Without them the radius assertion cannot run
     * at all, and the geospatial filter would have no behavioural coverage.
     *
     * Registering the six functions as SQLite UDFs makes the same SQL execute on
     * the test driver, so the radius filter is asserted for real rather than
     * skipped. This changes nothing for MySQL/Postgres, which already have them.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $connection = DB::connection();
        if ($connection->getDriverName() !== 'sqlite') {
            return;
        }

        $pdo = $connection->getPdo();
        if (! $pdo instanceof \PDO) {
            return;
        }

        $pdo->sqliteCreateFunction('radians', static fn ($degrees) => deg2rad((float) $degrees), 1);
        $pdo->sqliteCreateFunction('cos', static fn ($radians) => cos((float) $radians), 1);
        $pdo->sqliteCreateFunction('sin', static fn ($radians) => sin((float) $radians), 1);
        // Clamp before acos: floating point can push the argument just outside
        // [-1, 1], which is the same reason the query wraps it in greatest/least.
        $pdo->sqliteCreateFunction('acos', static fn ($value) => acos(max(-1.0, min(1.0, (float) $value))), 1);
        $pdo->sqliteCreateFunction('greatest', static fn ($a, $b) => max((float) $a, (float) $b), 2);
        $pdo->sqliteCreateFunction('least', static fn ($a, $b) => min((float) $a, (float) $b), 2);
    }

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

    public function test_location_filter_matches_the_combined_location_label(): void
    {
        Http::preventStrayRequests();

        $match = $this->listing(['title' => 'Departamento en Boca del Río']);
        $match->forceFill(['location' => 'Boca del Río, Veracruz'])->saveQuietly();
        $other = $this->listing(['title' => 'Departamento en Mérida']);
        $other->forceFill(['location' => 'Mérida, Yucatán'])->saveQuietly();

        $response = $this->getJson('/api/ads?location=' . urlencode('Boca del Río'));

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($match->id, $ids, 'a listing whose location matches the text filter must be returned');
        $this->assertNotContains($other->id, $ids, 'a listing elsewhere must not match the location text filter');
    }

    public function test_has_coords_filter_excludes_listings_without_coordinates(): void
    {
        Http::preventStrayRequests();

        $located = $this->listing(['title' => 'Con coordenadas']);
        $located->forceFill(['latitude' => 19.1738, 'longitude' => -96.1342])->saveQuietly();
        $unlocated = $this->listing(['title' => 'Sin coordenadas']);
        $unlocated->forceFill(['latitude' => null, 'longitude' => null])->saveQuietly();

        $response = $this->getJson('/api/ads?has_coords=1');

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($located->id, $ids);
        $this->assertNotContains($unlocated->id, $ids, 'listings without coordinates must be excluded from geo results');
    }

    public function test_radius_filter_drops_listings_outside_the_radius_and_without_coordinates(): void
    {
        Http::preventStrayRequests();

        // Veracruz port vs Xalapa are ~100 km apart, so a 25 km radius keeps one
        // and drops the other. A row with no coordinates can never be inside any
        // radius and must not leak into geo results.
        $near = $this->listing(['title' => 'Cerca del puerto']);
        $near->forceFill(['latitude' => 19.1738, 'longitude' => -96.1342])->saveQuietly();
        $far = $this->listing(['title' => 'En Xalapa']);
        $far->forceFill(['latitude' => 19.5438, 'longitude' => -96.9102])->saveQuietly();
        $unknown = $this->listing(['title' => 'Sin coordenadas']);
        $unknown->forceFill(['latitude' => null, 'longitude' => null])->saveQuietly();

        $response = $this->getJson('/api/ads?lat=19.1738&lng=-96.1342&radius=25');

        $response->assertOk();
        $ids = array_column($response->json('data'), 'id');
        $this->assertContains($near->id, $ids, 'a listing at the search origin must be inside the radius');
        $this->assertNotContains($far->id, $ids, 'a listing ~100km away must be outside a 25km radius');
        $this->assertNotContains($unknown->id, $ids, 'a listing without coordinates cannot be inside any radius');
    }

    public function test_offset_pagination_has_a_stable_total_order(): void
    {
        Http::preventStrayRequests();

        // Every row gets an identical timestamp and price, so the only thing that
        // can order them is the unique `orderByDesc('ads.id')` tie-breaker.
        $ids = [];
        for ($i = 0; $i < 20; $i++) {
            $ids[] = (int) $this->listing([
                'title' => "Anuncio {$i}",
                'price' => 1000,
                'created_at' => '2026-01-01 10:00:00',
            ])->id;
        }

        $expected = $ids;
        rsort($expected); // newest first, then id DESC as the tie-breaker

        // Capture the SQL the endpoint actually executes. Response order alone is
        // NOT sufficient: SQLite's incidental row order for tied sort keys happens
        // to coincide with `ads.id DESC` (measured -- removing the tie-breaker
        // leaves the returned arrays byte-identical on every sort mode), so an
        // order-only assertion cannot fail. The compiled ORDER BY can, and it is
        // what actually gives offset pagination a total order.
        $queries = [];
        DB::listen(static function ($query) use (&$queries): void {
            $queries[] = $query->sql;
        });

        $first = array_map('intval', array_column($this->getJson('/api/ads?page=1')->assertOk()->json('data'), 'id'));
        $second = array_map('intval', array_column($this->getJson('/api/ads?page=2')->assertOk()->json('data'), 'id'));

        $orderedCatalogQueries = array_values(array_filter(
            $queries,
            static fn (string $sql): bool => stripos($sql, 'from "ads"') !== false && stripos($sql, 'order by') !== false
        ));
        $this->assertNotEmpty($orderedCatalogQueries, 'the catalog request must execute an ordered query');
        foreach ($orderedCatalogQueries as $sql) {
            $this->assertMatchesRegularExpression(
                '/order by [\s\S]*"ads"\."id" desc\s*(?:limit|offset|$)/i',
                $sql,
                'the routed catalog ORDER BY must end with the unique ads.id tie-breaker, otherwise offset pagination has no total order'
            );
        }

        $this->assertSame(
            array_slice($expected, 0, 16),
            $first,
            'page 1 must follow the id tie-breaker, newest first'
        );
        $this->assertSame(
            array_slice($expected, 16),
            $second,
            'page 2 must continue the same total order'
        );
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
