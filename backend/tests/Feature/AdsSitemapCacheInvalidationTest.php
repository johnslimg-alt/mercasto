<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\SitemapController;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The canonical ads sitemap is cached for 30 minutes. Publishing must never wait for that TTL,
 * including the query-builder bulk paths (moderation reconciliation, bulk ad actions) that do
 * not fire model events.
 */
class AdsSitemapCacheInvalidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.url' => 'https://mercasto.test']);
        // AdObserver notifies IndexNow synchronously; never let a test reach the network.
        Http::fake();
        Cache::flush();
    }

    public function test_model_status_change_publishes_the_listing_without_waiting_for_the_ttl(): void
    {
        $listing = $this->hiddenListing();

        $before = $this->get('/sitemap-ads.xml');
        $before->assertOk();
        $before->assertDontSee('https://mercasto.test/ads/' . $listing->id, false);
        $this->assertSame('no_visible_inventory', $before->headers->get('X-Mercasto-Sitemap-Health'));

        $listing->forceFill(['status' => 'active', 'expires_at' => now()->addDays(3)])->save();

        $after = $this->get('/sitemap-ads.xml');
        $after->assertOk();
        $after->assertSee('https://mercasto.test/ads/' . $listing->id, false);
        $this->assertSame('ok', $after->headers->get('X-Mercasto-Sitemap-Health'));
    }

    public function test_reconciliation_bulk_update_publishes_without_waiting_for_the_ttl(): void
    {
        $listing = $this->hiddenListing();

        $this->get('/sitemap-ads.xml')
            ->assertOk()
            ->assertDontSee('https://mercasto.test/ads/' . $listing->id, false);

        // Activation runs through a conditional query-builder update: AdObserver never fires,
        // so the command itself has to drop the cached sitemap.
        $this->assertSame(0, Artisan::call('ads:reconcile-moderation-visibility', ['--apply' => true]));
        $this->assertSame('active', $listing->fresh()->status);

        $after = $this->get('/sitemap-ads.xml');
        $after->assertOk();
        $after->assertSee('https://mercasto.test/ads/' . $listing->id, false);
        $this->assertSame('ok', $after->headers->get('X-Mercasto-Sitemap-Health'));
    }

    public function test_pausing_a_published_listing_removes_it_from_the_cached_sitemap(): void
    {
        $listing = $this->hiddenListing();
        $listing->forceFill(['status' => 'active', 'expires_at' => now()->addDays(3)])->save();
        $this->get('/sitemap-ads.xml')->assertSee('https://mercasto.test/ads/' . $listing->id, false);

        $listing->forceFill(['status' => 'paused'])->save();

        $this->get('/sitemap-ads.xml')
            ->assertOk()
            ->assertDontSee('https://mercasto.test/ads/' . $listing->id, false);
    }

    public function test_forget_ads_cache_drops_the_inventory_and_every_chunk_key(): void
    {
        Cache::put('sitemap_ads_v4', ['xml' => 'stale'], 1800);
        Cache::put('sitemap_ads_chunk_count_v1', 3, 1800);
        Cache::put('sitemap_ads_v4_chunk_2', ['xml' => 'stale'], 1800);
        Cache::put('sitemap_ads_v4_chunk_4', ['xml' => 'stale'], 1800);

        SitemapController::forgetAdsCache();

        $this->assertFalse(Cache::has('sitemap_ads_v4'));
        $this->assertFalse(Cache::has('sitemap_ads_chunk_count_v1'));
        $this->assertFalse(Cache::has('sitemap_ads_v4_chunk_2'));
        // The cached chunk count was 3, so the spare tail chunk is dropped as well.
        $this->assertFalse(Cache::has('sitemap_ads_v4_chunk_4'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function hiddenListing(array $overrides = []): Ad
    {
        $seller = User::factory()->create();

        return Ad::withoutEvents(fn () => Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Bicicleta urbana con frenos revisados',
            'description' => 'Descripción verificable con detalle suficiente para no ser delgada.',
            'price' => 2500,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'status' => 'archived',
            // The P0 cohort: AI-approved but hidden. Deliberately not one of the
            // UNFINISHED_MODERATION_STATUSES, which AdObserver blocks owners from self-activating.
            'ai_moderation_status' => Ad::MODERATION_APPROVED,
            'expires_at' => null,
            'is_catalog_filler' => false,
        ], $overrides)));
    }
}
