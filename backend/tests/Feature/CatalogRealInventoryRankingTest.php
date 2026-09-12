<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Support\CatalogInventoryRanking;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Public catalog ranking policy for editorial catalog references ("fillers").
 *
 * Real seller inventory must always rank before catalog references, references are
 * bounded padding, and the `is_catalog_filler` marker must keep a stable boolean
 * response shape so the frontend never mistakes a real ad for a placeholder
 * (AdCard skips impression tracking for placeholders only).
 */
class CatalogRealInventoryRankingTest extends TestCase
{
    use RefreshDatabase;

    private ?User $seller = null;

    protected function setUp(): void
    {
        parent::setUp();

        // The default catalog path is cached for 60s; the array store is shared
        // across tests in the same process, so start every test from a cold cache.
        Cache::flush();
    }

    public function test_real_inventory_ranks_before_catalog_references_on_the_default_catalog(): void
    {
        Http::preventStrayRequests();

        // Real ads are created first so the pre-fix ordering (promotion, then
        // created_at/id DESC) would have put every reference above them.
        $real = [
            $this->ad(['title' => 'Bicicleta real 1']),
            $this->ad(['title' => 'Bicicleta real 2']),
            $this->ad(['title' => 'Bicicleta real 3']),
        ];

        for ($i = 0; $i < 12; $i++) {
            $this->filler(['title' => "Referencia de catálogo {$i}"]);
        }

        $response = $this->getJson('/api/ads?page=1');

        $response->assertOk()
            ->assertJsonPath('total', 15)
            ->assertJsonCount(11, 'data')
            // The top of page 1 is exactly the real inventory, and the first
            // catalog reference only starts after it.
            ->assertJsonPath('data.3.is_catalog_filler', true);

        $this->assertEqualsCanonicalizing(
            array_map(static fn (Ad $ad): int => $ad->id, $real),
            array_column(array_slice($response->json('data'), 0, 3), 'id')
        );

        $this->assertRealInventoryComesFirst($response->json('data'));
    }

    public function test_boosted_catalog_reference_never_outranks_real_inventory(): void
    {
        Http::preventStrayRequests();

        $real = $this->ad(['title' => 'Anuncio real sin promoción']);
        $boostedFiller = $this->filler([
            'title' => 'Referencia destacada',
            'promoted' => 'destacado',
            'boost_expires_at' => null,
        ]);

        $response = $this->getJson('/api/ads?page=1');

        $response->assertOk()
            ->assertJsonPath('data.0.id', $real->id)
            ->assertJsonPath('data.1.id', $boostedFiller->id);
    }

    public function test_requested_sort_mode_still_keeps_real_inventory_first(): void
    {
        Http::preventStrayRequests();

        $real = $this->ad(['title' => 'Anuncio real caro', 'price' => 99000]);
        $this->filler(['title' => 'Referencia barata', 'price' => 1]);

        $this->getJson('/api/ads?page=1&sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.0.id', $real->id);

        $this->getJson('/api/ads?page=1&sort=popular')
            ->assertOk()
            ->assertJsonPath('data.0.id', $real->id);
    }

    public function test_map_coordinate_filter_ranks_real_inventory_first(): void
    {
        Http::preventStrayRequests();

        $real = $this->ad([
            'title' => 'Anuncio real geolocalizado',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
        ]);
        $this->filler([
            'title' => 'Referencia geolocalizada',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
        ]);

        $this->getJson('/api/ads?page=1&has_coords=1')
            ->assertOk()
            ->assertJsonPath('data.0.id', $real->id);
    }

    public function test_catalog_reference_padding_is_capped_per_page(): void
    {
        Http::preventStrayRequests();

        $real = $this->ad(['title' => 'Anuncio real único']);

        for ($i = 0; $i < 20; $i++) {
            $this->filler(['title' => "Referencia {$i}"]);
        }

        $payload = $this->getJson('/api/ads?page=1')->assertOk()->json();

        $this->assertSame($real->id, $payload['data'][0]['id']);
        $this->assertSame(
            CatalogInventoryRanking::MAX_FILLERS_PER_PAGE + 1,
            count($payload['data']),
            'A page must serve real inventory plus at most the capped padding.'
        );
        $this->assertSame(
            CatalogInventoryRanking::MAX_FILLERS_PER_PAGE,
            $this->countFillers($payload['data'])
        );
        $this->assertRealInventoryComesFirst($payload['data']);
    }

    public function test_page_is_pure_real_inventory_when_real_ads_fill_it(): void
    {
        Http::preventStrayRequests();

        for ($i = 0; $i < 20; $i++) {
            $this->ad(['title' => "Anuncio real {$i}"]);
        }

        for ($i = 0; $i < 5; $i++) {
            $this->filler(['title' => "Referencia {$i}"]);
        }

        $payload = $this->getJson('/api/ads?page=1')->assertOk()->json();

        $this->assertCount(16, $payload['data']);
        $this->assertSame(0, $this->countFillers($payload['data']));
    }

    public function test_catalog_references_are_not_served_past_the_bounded_page_window(): void
    {
        Http::preventStrayRequests();

        for ($i = 0; $i < 200; $i++) {
            $this->filler(['title' => "Referencia {$i}"]);
        }

        $lastPaddedPage = $this->getJson('/api/ads?page='.CatalogInventoryRanking::MAX_FILLER_PAGE)
            ->assertOk()
            ->json();

        $this->assertSame(
            CatalogInventoryRanking::MAX_FILLERS_PER_PAGE,
            $this->countFillers($lastPaddedPage['data'])
        );

        $beyondWindow = $this->getJson('/api/ads?page='.(CatalogInventoryRanking::MAX_FILLER_PAGE + 1))
            ->assertOk()
            ->json();

        $this->assertSame([], $beyondWindow['data']);
    }

    public function test_pagination_is_stable_and_has_no_duplicates_with_references(): void
    {
        Http::preventStrayRequests();

        $realIds = [];
        for ($i = 0; $i < 4; $i++) {
            $realIds[] = $this->ad(['title' => "Anuncio real {$i}"])->id;
        }

        for ($i = 0; $i < 40; $i++) {
            $this->filler(['title' => "Referencia {$i}"]);
        }

        $seen = [];
        $firstPage = null;

        foreach ([1, 2, 3] as $page) {
            $payload = $this->getJson("/api/ads?page={$page}")->assertOk()->json();
            $this->assertLessThanOrEqual(
                CatalogInventoryRanking::MAX_FILLERS_PER_PAGE,
                $this->countFillers($payload['data']),
                "Page {$page} exceeded the filler cap."
            );

            $firstPage ??= $payload['data'];

            foreach ($payload['data'] as $row) {
                $this->assertArrayNotHasKey(
                    $row['id'],
                    $seen,
                    "Ad {$row['id']} was served twice across pages."
                );
                $seen[$row['id']] = true;
            }
        }

        foreach ($realIds as $id) {
            $this->assertArrayHasKey($id, $seen, 'Real inventory must stay reachable through pagination.');
        }

        // The whole real inventory is served on page 1, before any reference.
        $this->assertSame(4, $this->countReal($firstPage));
        $this->assertRealInventoryComesFirst($firstPage);
    }

    public function test_catalog_reference_flag_keeps_boolean_response_shape(): void
    {
        Http::preventStrayRequests();

        $this->ad(['title' => 'Anuncio real']);
        $this->filler(['title' => 'Referencia de catálogo']);

        $payload = $this->getJson('/api/ads?page=1')->assertOk()->json();
        $rows = $payload['data'];

        $this->assertCount(2, $rows);
        $this->assertSame(false, $rows[0]['is_catalog_filler']);
        $this->assertSame(true, $rows[1]['is_catalog_filler']);

        // A reference row must not lose (or gain) any key relative to a real row,
        // otherwise the card contract breaks for one of the two kinds.
        $this->assertSame(array_keys($rows[0]), array_keys($rows[1]));
        $this->assertArrayHasKey('user', $rows[1]);
        $this->assertArrayHasKey('id', $rows[1]);
        $this->assertArrayHasKey('title', $rows[1]);
    }

    public function test_featured_block_excludes_catalog_references(): void
    {
        Http::preventStrayRequests();

        $real = $this->ad([
            'title' => 'Destacado real',
            'promoted' => 'destacado',
            'boost_expires_at' => now()->addDay(),
        ]);
        $this->filler([
            'title' => 'Destacado de catálogo',
            'promoted' => 'destacado',
            'boost_expires_at' => now()->addDay(),
        ]);

        $payload = $this->getJson('/api/ads/featured')->assertOk()->json();

        $this->assertCount(1, $payload['data']);
        $this->assertSame($real->id, $payload['data'][0]['id']);
        $this->assertSame(false, $payload['data'][0]['is_catalog_filler']);
    }

    private function assertRealInventoryComesFirst(array $rows): void
    {
        $seenFiller = false;

        foreach ($rows as $row) {
            if ($row['is_catalog_filler'] === true) {
                $seenFiller = true;
                continue;
            }

            $this->assertFalse(
                $seenFiller,
                'Real inventory was served after a catalog reference.'
            );
        }
    }

    private function countFillers(array $rows): int
    {
        return count(array_filter($rows, static fn (array $row): bool => $row['is_catalog_filler'] === true));
    }

    private function countReal(array $rows): int
    {
        return count(array_filter($rows, static fn (array $row): bool => $row['is_catalog_filler'] === false));
    }

    private function ad(array $overrides = []): Ad
    {
        return Ad::query()->create([
            'user_id' => $this->seller()->id,
            'title' => 'Anuncio de prueba',
            'description' => 'Anuncio real de un vendedor para la prueba de ranking.',
            'price' => 1500,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'status' => 'active',
            'is_catalog_filler' => false,
            ...$overrides,
        ]);
    }

    private function filler(array $overrides = []): Ad
    {
        return $this->ad([
            'title' => 'Referencia de catálogo',
            'description' => 'Referencia editorial del catálogo, no es inventario de vendedor.',
            'user_id' => $this->seller()->id,
            'is_catalog_filler' => true,
            ...$overrides,
        ]);
    }

    private function seller(): User
    {
        return $this->seller ??= User::factory()->create();
    }
}
