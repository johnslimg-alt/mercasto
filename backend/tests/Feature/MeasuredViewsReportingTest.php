<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The admin and seller dashboards must publish views from the measurement log
 * (ad_views), never from the unverified `ads.views` demo counter.
 *
 * `ads.views` was filled with rand() values by bulk demo seeders, so a large
 * counter value must never become the headline KPI.
 */
class MeasuredViewsReportingTest extends TestCase
{
    use RefreshDatabase;

    private const SYNTHETIC_COUNTER = 12036671;

    private function createAd(User $seller, array $overrides = []): Ad
    {
        return Ad::withoutEvents(fn () => Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Anuncio de prueba',
            'description' => 'Descripción de prueba',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'status' => 'active',
            'attributes' => ['subcategory' => 'general'],
        ], $overrides)));
    }

    private function recordMeasuredView(Ad $ad, int $daysAgo = 0): void
    {
        DB::table('ad_views')->insert([
            'ad_id' => $ad->id,
            'user_id' => null,
            'ip_address' => 'hash-' . uniqid(),
            'created_at' => now()->subDays($daysAgo),
            'updated_at' => now()->subDays($daysAgo),
        ]);
    }

    public function test_admin_total_views_is_measured_and_the_counter_is_labelled_unverified(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();

        // One ad carrying a huge synthetic counter, exactly two measured views.
        $ad = $this->createAd($seller, ['views' => self::SYNTHETIC_COUNTER]);
        $this->recordMeasuredView($ad);
        $this->recordMeasuredView($ad);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics');
        $response->assertOk();

        // The KPI is the measurement, not the counter.
        $this->assertSame(2, $response->json('total_views'), 'total_views must count ad_views rows');
        $this->assertSame('ad_views', $response->json('total_views_source'));
        $this->assertTrue($response->json('total_views_verified'));

        // The old headline is still visible, but never as a verified KPI.
        $this->assertSame(self::SYNTHETIC_COUNTER, $response->json('total_views_legacy_counter'));
        $this->assertFalse($response->json('total_views_legacy_counter_verified'));

        // A synthetic counter must not leak into the KPI through any alias.
        $this->assertNotSame(self::SYNTHETIC_COUNTER, $response->json('total_views'));
    }

    public function test_admin_total_views_ignores_catalogue_when_ads_views_is_inflated(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();

        $ad = $this->createAd($seller, ['views' => 4500]);
        $this->recordMeasuredView($ad, 2);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics?period=30');
        $response->assertOk();

        $this->assertSame(1, $response->json('total_views'));
        $this->assertSame(1, $response->json('total_views_period'));
        $this->assertSame(4500, $response->json('total_views_legacy_counter'));
    }

    public function test_admin_views_period_counts_only_the_window(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, ['views' => 999999]);

        $this->recordMeasuredView($ad, 2);
        $this->recordMeasuredView($ad, 200);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics?period=30');
        $response->assertOk();

        $this->assertSame(2, $response->json('total_views'), 'all-time measured views');
        $this->assertSame(1, $response->json('total_views_period'), 'only in-window measured views');
    }

    public function test_seller_total_views_is_measured_and_the_counter_is_labelled_unverified(): void
    {
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, ['views' => 2038]);
        $this->recordMeasuredView($ad);

        $response = $this->actingAs($seller)->getJson('/api/seller/stats');
        $response->assertOk();

        $this->assertSame(1, $response->json('total_views'));
        $this->assertSame('ad_views', $response->json('total_views_source'));
        $this->assertTrue($response->json('total_views_verified'));
        $this->assertSame(2038, $response->json('total_views_legacy_counter'));
        $this->assertFalse($response->json('total_views_legacy_counter_verified'));
    }

    public function test_seller_views_series_is_never_synthesised_from_the_counter(): void
    {
        $seller = User::factory()->create();
        // A seller with a large synthetic counter and no measured views at all.
        $this->createAd($seller, ['views' => 4500]);

        $response = $this->actingAs($seller)->getJson('/api/seller/stats');
        $response->assertOk();

        // The old implementation invented a 7-day curve from the counter.
        $this->assertSame(0, $response->json('total_views'));
        $this->assertSame(0, $response->json('views_this_week'));
        $this->assertSame(0, $response->json('views_last_week'));
        $this->assertSame('none', $response->json('views_series_source'));

        foreach ($response->json('views_by_day') as $day) {
            $this->assertSame(0, $day['views'], 'an unmeasured day must stay zero, not be filled in');
        }
    }

    public function test_seller_views_series_source_is_ad_views_when_measured_data_exists(): void
    {
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, ['views' => 0]);
        $this->recordMeasuredView($ad, 1);

        $response = $this->actingAs($seller)->getJson('/api/seller/stats');
        $response->assertOk();

        $this->assertSame('ad_views', $response->json('views_series_source'));
        $this->assertSame(1, $response->json('total_views'));
    }

    public function test_a_seller_cannot_see_another_sellers_measured_views(): void
    {
        $seller = User::factory()->create();
        $other = User::factory()->create();

        $mine = $this->createAd($seller, ['views' => 5000]);
        $theirs = $this->createAd($other, ['views' => 5000]);
        $this->recordMeasuredView($mine);
        $this->recordMeasuredView($theirs);
        $this->recordMeasuredView($theirs);

        $response = $this->actingAs($seller)->getJson('/api/seller/stats');
        $response->assertOk();

        $this->assertSame(1, $response->json('total_views'), 'only the caller\'s measured views count');
        $this->assertSame(5000, $response->json('total_views_legacy_counter'), 'and only the caller\'s counter');
    }
}
