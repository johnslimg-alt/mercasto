<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Contract of the crawler-readable share card used by every outbound share
 * (src/utils/shareLinks.js builds `/share/ads/{id}?utm_*`).
 */
class ShareAdCardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.url' => 'https://mercasto.test']);
    }

    private function activeAd(array $overrides = []): Ad
    {
        return Ad::create(array_merge([
            'user_id' => User::factory()->create()->id,
            'title' => 'Fundas para Asientos de Piel Sintética - Modelo G',
            'price' => 1450,
            'description' => 'Cubreasientos/fundas para asientos de auto, material Piel sintética, color Negro con vivos rojos. Renueva el interior de tu auto y protege los asientos originales del desgaste diario provocado por el uso intensivo.',
            'location' => 'Ciudad de México',
            'city' => 'Ciudad de México',
            'state' => 'Ciudad de México',
            'category' => 'motor',
            'subcategory' => 'Accesorios',
            'condition' => 'nuevo',
            'attributes' => ['subcategory' => 'Accesorios'],
            'status' => 'active',
        ], $overrides));
    }

    public function test_share_card_uses_the_canonical_listing_as_og_url(): void
    {
        $ad = $this->activeAd();

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/html; charset=UTF-8');
        $canonical = "https://mercasto.test/ads/{$ad->id}";
        $response->assertSee("<meta property=\"og:url\" content=\"{$canonical}\">", false);
        $response->assertSee("<link rel=\"canonical\" href=\"{$canonical}\">", false);
        $response->assertSee('<meta property="og:type" content="product">', false);
        $response->assertDontSee("content=\"https://mercasto.test/share/ads/{$ad->id}\"", false);
        $response->assertDontSee('#ad-', false);
    }

    public function test_share_card_redirect_keeps_attribution_params_and_drops_unknown_ones(): void
    {
        $ad = $this->activeAd();

        $query = http_build_query([
            'utm_source' => 'whatsapp',
            'utm_medium' => 'social',
            'utm_campaign' => 'listing_share',
            'utm_content' => 'ad_detail',
            'utm_term' => "ad_{$ad->id}",
            'fbclid' => 'abc123',
            'evil' => '<script>alert(1)</script>',
        ], '', '&', PHP_QUERY_RFC3986);

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}?{$query}");

        $response->assertOk();
        $response->assertSee("url=https://mercasto.test/ads/{$ad->id}?", false);
        $response->assertSee('utm_source=whatsapp&amp;utm_medium=social&amp;utm_campaign=listing_share', false);
        $response->assertSee("utm_content=ad_detail&amp;utm_term=ad_{$ad->id}&amp;fbclid=abc123", false);
        $response->assertSee('location.replace(', false);
        $response->assertDontSee('evil=', false);
        $response->assertDontSee('<script>alert(1)</script>', false);
    }

    public function test_share_card_without_query_string_redirects_to_the_clean_canonical(): void
    {
        $ad = $this->activeAd();

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertSee("<meta http-equiv=\"refresh\" content=\"0; url=https://mercasto.test/ads/{$ad->id}\">", false);
        $response->assertSee("<a href=\"https://mercasto.test/ads/{$ad->id}\">Ver anuncio en Mercasto</a>", false);
    }

    public function test_share_card_description_is_never_cut_mid_word(): void
    {
        // 180 characters ends inside the 14th "cubreasientos" token.
        $ad = $this->activeAd(['description' => str_repeat('cubreasientos ', 13)]);

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertSee('cubreasientos…">', false);
        $response->assertDontSee('cubreasiento…">', false);
    }

    public function test_share_card_keeps_the_natural_last_complete_word(): void
    {
        $ad = $this->activeAd();

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertSee('del desgaste…">', false);
        $response->assertDontSee('desgaste diar', false);
    }

    public function test_share_card_declares_real_dimensions_for_local_storage_photos(): void
    {
        $publicPath = sys_get_temp_dir() . '/mercasto-share-card-' . uniqid();
        mkdir($publicPath . '/storage/ads', 0777, true);
        copy(base_path('../public/icon-512x512.png'), $publicPath . '/storage/ads/photo.png');
        $this->app->usePublicPath($publicPath);

        try {
            $ad = $this->activeAd(['image_url' => 'ads/photo.png']);

            $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

            $response->assertSee('<meta property="og:image" content="https://mercasto.test/storage/ads/photo.png">', false);
            $response->assertSee('<meta property="og:image:width" content="512">', false);
            $response->assertSee('<meta property="og:image:height" content="512">', false);
        } finally {
            @unlink($publicPath . '/storage/ads/photo.png');
            @rmdir($publicPath . '/storage/ads');
            @rmdir($publicPath . '/storage');
            @rmdir($publicPath);
        }
    }

    public function test_share_card_omits_image_dimensions_when_they_cannot_be_verified(): void
    {
        $ad = $this->activeAd(['image_url' => 'https://images.unsplash.com/photo-1234567890']);

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertSee('<meta property="og:image" content="https://images.unsplash.com/photo-1234567890">', false);
        $response->assertDontSee('og:image:width', false);
    }

    public function test_share_card_does_not_follow_traversal_paths_when_resolving_dimensions(): void
    {
        $ad = $this->activeAd(['image_url' => 'storage/../../../etc/passwd']);

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertOk();
        $response->assertDontSee('og:image:width', false);
    }

    public function test_share_card_uses_the_site_icon_when_the_listing_has_no_photo(): void
    {
        $ad = $this->activeAd(['image_url' => null, 'image' => null]);

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertSee('<meta property="og:image" content="https://mercasto.test/icon-512x512.png">', false);
    }

    public function test_share_card_is_noindex_and_follows_the_canonical_listing(): void
    {
        $ad = $this->activeAd();

        $response = $this->get("https://mercasto.test/share/ads/{$ad->id}");

        $response->assertSee('<meta name="robots" content="noindex,follow">', false);
    }

    public function test_share_card_is_not_served_for_missing_or_inactive_listings(): void
    {
        $ad = $this->activeAd(['status' => 'paused']);

        $this->get("https://mercasto.test/share/ads/{$ad->id}")->assertNotFound();
        $this->get('https://mercasto.test/share/ads/999999')->assertNotFound();
    }
}
