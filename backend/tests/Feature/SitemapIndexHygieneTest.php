<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SitemapIndexHygieneTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'https://mercasto.test']);
        Cache::flush();
    }

    public function test_sitemap_index_excludes_noncanonical_state_sitemap(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertOk();
        $response->assertDontSee('/sitemap-states.xml', false);
        $response->assertSee('/sitemap-main.xml', false);
        $response->assertSee('/sitemap-ads.xml', false);
    }

    public function test_main_sitemap_contains_canonical_source_pages_only(): void
    {
        $response = $this->get('/sitemap-main.xml');

        $response->assertOk();
        foreach ([
            '/vendedores',
            '/como-funciona',
            '/seguridad',
            '/ayuda/publicar-anuncio',
            '/ayuda/comprar-y-contactar',
            '/tarifas',
            '/sobre-mercasto',
        ] as $path) {
            $response->assertSee('https://mercasto.test' . $path, false);
        }
        $response->assertDontSee('https://mercasto.test/safety', false);
        $response->assertDontSee('https://mercasto.test/acerca-de', false);
        $response->assertSee('https://mercasto.test/reembolsos/', false);
        $response->assertSee('https://mercasto.test/moderacion/', false);
        $response->assertDontSee('<loc>https://mercasto.test/reembolsos</loc>', false);
        $response->assertDontSee('<loc>https://mercasto.test/moderacion</loc>', false);
    }

    public function test_ad_sitemap_contains_only_genuine_active_unexpired_listings(): void
    {
        $user = User::factory()->create();
        $base = [
            'user_id' => $user->id,
            'description' => 'Descripción verificable.',
            'price' => 1000,
            'location' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
        ];

        $genuine = Ad::query()->create($base + [
            'title' => 'Anuncio real disponible',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
        ]);
        $catalog = Ad::query()->create($base + [
            'title' => 'Referencia de catálogo',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => true,
        ]);
        $approved = Ad::query()->create($base + [
            'title' => 'Aprobado esperando vendedor',
            'status' => 'approved',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
        ]);
        $expired = Ad::query()->create($base + [
            'title' => 'Activo pero vencido',
            'status' => 'active',
            'expires_at' => now()->subMinute(),
            'is_catalog_filler' => false,
        ]);

        $response = $this->get('/sitemap-ads.xml');

        $response->assertOk();
        $response->assertSee("https://mercasto.test/ads/{$genuine->id}", false);
        $response->assertDontSee("https://mercasto.test/ads/{$catalog->id}", false);
        $response->assertDontSee("https://mercasto.test/ads/{$approved->id}", false);
        $response->assertDontSee("https://mercasto.test/ads/{$expired->id}", false);
    }

    public function test_legacy_state_sitemap_stays_valid_but_empty(): void
    {
        $response = $this->get('/sitemap-states.xml');

        $response->assertOk();
        $response->assertSee('<urlset', false);
        $response->assertDontSee('<url>', false);
        $response->assertDontSee('?state=', false);
    }

    public function test_category_sitemap_skips_query_only_categories(): void
    {
        Category::updateOrCreate(
            ['slug' => 'motor'],
            ['name' => ['es' => 'Motor'], 'icon' => 'Car', 'sort_order' => 1],
        );
        Category::updateOrCreate(
            ['slug' => 'formacion'],
            ['name' => ['es' => 'Formación'], 'icon' => 'BookOpen', 'sort_order' => 2],
        );

        $response = $this->get('/sitemap-categories.xml');

        $response->assertOk();
        $response->assertSee('https://mercasto.test/motor', false);
        $response->assertDontSee('?category=', false);
        $response->assertDontSee('formacion', false);
    }

    public function test_ad_sitemap_publishes_canonical_url_and_valid_lastmod(): void
    {
        $listing = $this->createListing([
            'title' => 'Bicicleta urbana con frenos revisados',
        ]);
        // updated_at is not mass assignable: age the row through the query builder.
        Ad::query()->whereKey($listing->id)->update(['updated_at' => now()->subHours(2)]);
        $listing->refresh();

        $response = $this->get('/sitemap-ads.xml');

        $response->assertOk();
        $response->assertSee('<loc>https://mercasto.test/ads/' . $listing->id . '</loc>', false);
        $response->assertSee(
            '<lastmod>' . $listing->updated_at->toW3cString() . '</lastmod>',
            false
        );
        $response->assertDontSee('https://mercasto.test/ads/' . $listing->id . '?', false);
        $response->assertDontSee('https://mercasto.test/anuncio/', false);
    }

    public function test_ad_sitemap_clamps_future_lastmod_to_now(): void
    {
        $listing = $this->createListing([
            'title' => 'Silla de oficina ergonómica',
        ]);
        Ad::query()->whereKey($listing->id)->update(['updated_at' => now()->addDay()]);

        $response = $this->get('/sitemap-ads.xml');

        $response->assertOk();
        preg_match(
            '#<loc>https://mercasto\.test/ads/' . $listing->id . '</loc>\s*<lastmod>([^<]+)</lastmod>#',
            $response->getContent(),
            $matches
        );
        $this->assertNotEmpty($matches, 'published listing must carry a lastmod');
        $this->assertTrue(
            Carbon::parse($matches[1])->lessThanOrEqualTo(now()->addSecond()),
            'lastmod must never be in the future'
        );
    }

    public function test_ad_sitemap_excludes_thin_placeholder_and_duplicated_listings(): void
    {
        $thinTitle = $this->createListing([
            'title' => 'ok',
            'description' => 'Descripción suficientemente larga para pasar el mínimo de longitud.',
        ]);
        $thinDescription = $this->createListing([
            'title' => 'Anuncio con descripción mínima',
            'description' => 'corto',
        ]);
        $placeholder = $this->createListing([
            'title' => 'Prueba',
            'description' => 'Descripción suficientemente larga para pasar el mínimo de longitud.',
        ]);

        $duplicateContent = [
            'title' => 'Sierra circular de banco',
            'description' => 'Sierra circular de banco en buen estado, con disco nuevo y guía lateral.',
            'price' => 3200,
            'category' => 'herramientas',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
        ];
        $olderDuplicate = $this->createListing($duplicateContent);
        Ad::query()->whereKey($olderDuplicate->id)->update(['updated_at' => now()->subDay()]);
        $newerDuplicate = $this->createListing($duplicateContent);
        $unrelated = $this->createListing(['title' => 'Taladro inalámbrico 20V']);

        $response = $this->get('/sitemap-ads.xml');

        $response->assertOk();
        $response->assertSee('https://mercasto.test/ads/' . $unrelated->id, false);
        $response->assertSee('https://mercasto.test/ads/' . $newerDuplicate->id, false);
        $response->assertDontSee('https://mercasto.test/ads/' . $olderDuplicate->id, false);
        $response->assertDontSee('https://mercasto.test/ads/' . $thinTitle->id, false);
        $response->assertDontSee('https://mercasto.test/ads/' . $thinDescription->id, false);
        $response->assertDontSee('https://mercasto.test/ads/' . $placeholder->id, false);
    }

    public function test_ad_sitemap_never_lists_catalog_fillers_even_with_a_future_expiry(): void
    {
        $filler = $this->createListing([
            'title' => 'Referencia de catálogo con vigencia',
            'is_catalog_filler' => true,
        ]);
        // Bypass the model mutators so the row really carries a future expiry: the filler flag
        // alone must keep it out of the sitemap.
        Ad::query()->whereKey($filler->id)->update(['expires_at' => now()->addDays(3)]);

        $response = $this->get('/sitemap-ads.xml');

        $response->assertOk();
        $response->assertDontSee('https://mercasto.test/ads/' . $filler->id, false);
    }

    public function test_ad_sitemap_fails_loudly_when_visible_real_listings_are_not_indexable(): void
    {
        Log::spy();

        // Production shape that silently emptied the ads sitemap: real, publicly visible
        // listings whose expiry was never written.
        $this->createListing([
            'title' => 'Anuncio visible sin vigencia registrada',
            'expires_at' => null,
        ]);

        $response = $this->get('/sitemap-ads.xml');

        $response->assertStatus(503);
        $response->assertHeader('X-Mercasto-Sitemap-Urls', '0');
        $response->assertHeader('X-Mercasto-Sitemap-Health', 'visible_inventory_not_indexable');
        $response->assertHeader('Retry-After', '900');
        Log::shouldHaveReceived('error')
            ->withArgs(fn ($message) => $message === 'ads_sitemap.visible_inventory_not_indexable')
            ->once();
    }

    public function test_ad_sitemap_warns_but_stays_valid_when_no_listing_is_visible(): void
    {
        Log::spy();

        // Real inventory that is not publicly visible (archived) is not an outage.
        $this->createListing([
            'title' => 'Anuncio archivado del vendedor',
            'status' => 'archived',
            'expires_at' => null,
        ]);

        $response = $this->get('/sitemap-ads.xml');

        $response->assertOk();
        $response->assertHeader('X-Mercasto-Sitemap-Urls', '0');
        $response->assertHeader('X-Mercasto-Sitemap-Health', 'no_visible_inventory');
        $response->assertSee('<urlset', false);
        $response->assertDontSee('<url>', false);
        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($message) => $message === 'ads_sitemap.no_visible_inventory')
            ->once();
        Log::shouldNotHaveReceived('error');
    }

    public function test_ad_sitemap_chunks_inventory_and_the_index_advertises_every_chunk(): void
    {
        config(['marketplace.ads_sitemap.urls_per_chunk' => 2]);

        $published = collect(range(1, 5))
            ->map(fn (int $index) => $this->createListing([
                'title' => "Anuncio elegible número {$index}",
            ]))
            ->pluck('id');

        $chunkOne = $this->get('/sitemap-ads.xml');
        $chunkOne->assertOk();
        $chunkTwo = $this->get('/sitemap-ads-2.xml');
        $chunkTwo->assertOk();
        $chunkThree = $this->get('/sitemap-ads-3.xml');
        $chunkThree->assertOk();
        $this->get('/sitemap-ads-4.xml')->assertNotFound();

        preg_match_all('#/ads/(\d+)#', $chunkOne->getContent() . $chunkTwo->getContent() . $chunkThree->getContent(), $matches);
        $chunked = array_map('intval', $matches[1]);
        sort($chunked);
        $this->assertSame($published->sort()->values()->all(), $chunked, 'chunks must cover every listing exactly once');
        $this->assertCount(2, array_filter(explode("\n", $chunkOne->getContent()), fn ($line) => str_contains($line, '<url>')));

        $index = $this->get('/sitemap.xml');
        $index->assertOk();
        $index->assertSee('https://mercasto.test/sitemap-ads.xml', false);
        $index->assertSee('https://mercasto.test/sitemap-ads-2.xml', false);
        $index->assertSee('https://mercasto.test/sitemap-ads-3.xml', false);
        $index->assertDontSee('https://mercasto.test/sitemap-ads-4.xml', false);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createListing(array $overrides = []): Ad
    {
        $user = User::factory()->create();

        return Ad::query()->create(array_merge([
            'user_id' => $user->id,
            'title' => 'Anuncio real disponible',
            'description' => 'Descripción verificable con detalle suficiente para no ser delgada.',
            'price' => 1000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
        ], $overrides));
    }
}
