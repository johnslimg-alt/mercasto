<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
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
}
