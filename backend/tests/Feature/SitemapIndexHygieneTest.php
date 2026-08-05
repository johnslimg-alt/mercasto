<?php

namespace Tests\Feature;

use App\Models\Category;
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
        Category::create([
            'slug' => 'motor',
            'name' => ['es' => 'Motor'],
            'icon' => 'Car',
            'sort_order' => 1,
        ]);
        Category::create([
            'slug' => 'formacion',
            'name' => ['es' => 'Formación'],
            'icon' => 'BookOpen',
            'sort_order' => 2,
        ]);

        $response = $this->get('/sitemap-categories.xml');

        $response->assertOk();
        $response->assertSee('https://mercasto.test/motor', false);
        $response->assertDontSee('?category=', false);
        $response->assertDontSee('formacion', false);
    }
}
