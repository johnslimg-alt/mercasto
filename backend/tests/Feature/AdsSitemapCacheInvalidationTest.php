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

    public function test_content_edit_that_changes_membership_invalidates_the_sitemap(): void
    {
        // Thin content is excluded by curation, so this listing is publicly visible but absent
        // from the sitemap. Editing the title/description changes membership without touching
        // status, expires_at or is_catalog_filler.
        $listing = $this->hiddenListing([
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'title' => 'ok',
            'description' => 'corto',
        ]);

        $this->get('/sitemap-ads.xml')
            ->assertDontSee('https://mercasto.test/ads/' . $listing->id, false);

        $listing->forceFill([
            'title' => 'Bicicleta urbana con frenos revisados',
            'description' => 'Descripción verificable con detalle suficiente para no ser delgada.',
        ])->save();

        $after = $this->get('/sitemap-ads.xml');
        $after->assertOk();
        $after->assertSee('https://mercasto.test/ads/' . $listing->id, false);
        $this->assertSame('ok', $after->headers->get('X-Mercasto-Sitemap-Health'));
    }

    public function test_forget_ads_cache_bumps_the_generation_so_the_next_request_rebuilds(): void
    {
        $listing = $this->hiddenListing();
        $listing->forceFill(['status' => 'active', 'expires_at' => now()->addDays(3)])->save();
        $this->get('/sitemap-ads.xml')->assertSee('https://mercasto.test/ads/' . $listing->id, false);

        $before = (int) Cache::get('sitemap_ads_generation_v1', 1);

        SitemapController::forgetAdsCache();

        // Invalidation is a durable generation bump: every chunk key is scoped to the generation,
        // so nothing has to be enumerated and nothing can be served stale afterwards.
        $this->assertSame($before + 1, (int) Cache::get('sitemap_ads_generation_v1', 1));

        Ad::query()->whereKey($listing->id)->update(['status' => 'archived']);

        $this->get('/sitemap-ads.xml')
            ->assertOk()
            ->assertDontSee('https://mercasto.test/ads/' . $listing->id, false);
    }

    public function test_a_cached_chunk_is_not_served_stale_after_its_count_key_expires(): void
    {
        config(['marketplace.ads_sitemap.urls_per_chunk' => 2]);

        // Newest-first ordering with two URLs per chunk: chunk 3 holds the two oldest listings.
        $listings = collect(range(1, 6))
            ->map(fn (int $index) => $this->hiddenListing([
                'status' => 'active',
                'expires_at' => now()->addDays(3),
                'title' => "Anuncio elegible número {$index}",
            ]));
        $oldest = $listings->first();

        // Prime the index (chunk-count key) and the third chunk.
        $this->get('/sitemap.xml')->assertOk();
        $this->get('/sitemap-ads-3.xml')
            ->assertOk()
            ->assertSee('https://mercasto.test/ads/' . $oldest->id, false);

        // The chunk's own 30-minute TTL starts when the chunk is requested, so it can outlive the
        // chunk-count key. Simulate that expiry, then hide a listing the cached chunk advertises.
        Cache::forget('sitemap_ads_chunk_count_v1');
        Ad::query()->whereKey($oldest->id)->update(['status' => 'archived']);

        SitemapController::forgetAdsCache();

        $this->get('/sitemap-ads-3.xml')
            ->assertOk()
            ->assertDontSee('https://mercasto.test/ads/' . $oldest->id, false);
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
