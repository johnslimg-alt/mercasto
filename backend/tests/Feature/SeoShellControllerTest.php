<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SeoShellControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.url' => 'https://mercasto.test',
            'app.frontend_shell_url' => 'http://frontend.test/index.html',
        ]);

        Http::fake([
            'http://frontend.test/index.html' => Http::response($this->frontendShell(), 200),
        ]);
    }

    public function test_listings_route_returns_current_spa_shell_with_collection_metadata(): void
    {
        $response = $this->get('https://mercasto.test/listings');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $response->assertSee('<title>Anuncios clasificados en México | Mercasto</title>', false);
        $response->assertSee('<link rel="canonical" href="https://mercasto.test/listings" />', false);
        $response->assertSee('content="index,follow,max-image-preview:large"', false);
        $response->assertSee('"@type":"CollectionPage"', false);
        $response->assertSee('<script type="module" src="/assets/app-current.js"></script>', false);
        $response->assertDontSee('https://mercasto.test/" />', false);
    }

    public function test_active_ad_route_returns_product_metadata_without_raw_multilingual_json(): void
    {
        $user = User::factory()->create();
        $ad = Ad::create([
            'user_id' => $user->id,
            'title' => json_encode(['es' => 'Bicicleta urbana', 'en' => 'City bicycle']),
            'description' => json_encode(['es' => 'Lista para rodar por toda la ciudad.', 'en' => 'Ready to ride.']),
            'price' => 3500,
            'location' => 'Guadalajara',
            'category' => 'deportes',
            'condition' => 'usado',
            'image_url' => 'ads/bicicleta.webp',
            'status' => 'active',
        ]);

        $response = $this->get("https://mercasto.test/ads/{$ad->id}");

        $response->assertOk();
        $response->assertSee('<title>Bicicleta urbana | Mercasto</title>', false);
        $response->assertSee("https://mercasto.test/ads/{$ad->id}", false);
        $response->assertSee('https://mercasto.test/storage/ads/bicicleta.webp', false);
        $response->assertSee('"@type":"Product"', false);
        $response->assertSee('"price":"3500.00"', false);
        $response->assertDontSee('City bicycle');
        $response->assertDontSee('&quot;es&quot;');
        $response->assertSee('<script type="module" src="/assets/app-current.js"></script>', false);
    }

    public function test_inactive_ad_does_not_receive_an_indexable_shell(): void
    {
        $user = User::factory()->create();
        $ad = Ad::create([
            'user_id' => $user->id,
            'title' => 'Anuncio oculto',
            'description' => 'No debe indexarse.',
            'price' => 100,
            'location' => 'Puebla',
            'category' => 'hogar',
            'status' => 'pending',
        ]);

        $this->get("https://mercasto.test/ads/{$ad->id}")->assertNotFound();
    }

    public function test_missing_or_invalid_frontend_shell_fails_closed(): void
    {
        config(['app.frontend_shell_url' => 'http://invalid-shell.test/index.html']);
        Http::fake([
            'http://invalid-shell.test/index.html' => Http::response('<html>invalid</html>', 200),
        ]);

        $this->get('https://mercasto.test/listings')->assertServerError();
    }

    private function frontendShell(): string
    {
        return <<<'HTML'
<!doctype html><html lang="es"><head>
<title>Mercasto home</title>
<meta name="description" content="home description" />
<link rel="canonical" href="https://mercasto.test/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Mercasto home" />
<meta property="og:description" content="home description" />
<meta property="og:url" content="https://mercasto.test/" />
<meta property="og:image" content="https://mercasto.test/home.png" />
<meta name="twitter:title" content="Mercasto home" />
<meta name="twitter:description" content="home description" />
<meta name="twitter:image" content="https://mercasto.test/home.png" />
<script type="application/ld+json" id="schema-ld-json">{"@type":"WebSite"}</script>
</head><body><div id="root"></div><script type="module" src="/assets/app-current.js"></script></body></html>
HTML;
    }
}
