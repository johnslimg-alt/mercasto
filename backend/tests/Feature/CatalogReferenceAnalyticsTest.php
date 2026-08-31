<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use App\Support\PrivacyFingerprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CatalogReferenceAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_reference_view_is_ignored(): void
    {
        $ad = $this->makeAd(true);

        $this->postJson("/api/ads/{$ad->id}/view")
            ->assertOk()
            ->assertJson(['ignored' => true, 'message' => 'Referencia de catálogo']);

        $this->assertDatabaseCount('ad_views', 0);
        $this->assertSame(0, (int) $ad->fresh()->views);
    }

    public function test_batch_impressions_record_only_genuine_active_ads(): void
    {
        $catalog = $this->makeAd(true);
        $genuine = $this->makeAd(false);

        $ip = '203.0.113.42';
        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/ads/impressions', [
                'ad_ids' => [$catalog->id, $genuine->id],
                'placement' => 'feed',
            ])->assertOk()->assertJson(['recorded' => 1]);

        $this->assertDatabaseMissing('ad_impressions', ['ad_id' => $catalog->id]);
        $this->assertDatabaseHas('ad_impressions', [
            'ad_id' => $genuine->id,
            'ip_address' => PrivacyFingerprint::ip($ip, 'ad-impression'),
        ]);
        $this->assertDatabaseMissing('ad_impressions', ['ip_address' => $ip]);
        $this->assertDatabaseMissing('ad_impressions', ['ip_address' => hash('sha256', $ip)]);
    }

    public function test_genuine_view_persists_keyed_fingerprint_and_honors_legacy_dedupe(): void
    {
        $ad = $this->makeAd(false);
        $ip = '203.0.113.43';

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson("/api/ads/{$ad->id}/view")
            ->assertOk();

        $this->assertDatabaseHas('ad_views', [
            'ad_id' => $ad->id,
            'ip_address' => PrivacyFingerprint::ip($ip, 'ad-view'),
        ]);
        $this->assertDatabaseMissing('ad_views', ['ip_address' => $ip]);

        DB::table('ad_views')->where('ad_id', $ad->id)->delete();
        DB::table('ad_views')->insert([
            'ad_id' => $ad->id,
            'user_id' => null,
            'ip_address' => hash('sha256', $ip),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $viewsBefore = (int) $ad->fresh()->views;

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson("/api/ads/{$ad->id}/view")
            ->assertOk()
            ->assertJson(['ignored' => true]);

        $this->assertSame($viewsBefore, (int) $ad->fresh()->views);
        $this->assertDatabaseCount('ad_views', 1);
    }

    public function test_genuine_click_persists_keyed_fingerprint(): void
    {
        $ad = $this->makeAd(false);
        $ip = '203.0.113.44';

        $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson("/api/ads/{$ad->id}/click", ['channel' => 'share'])
            ->assertOk();

        $this->assertDatabaseHas('ad_clicks', [
            'ad_id' => $ad->id,
            'ip_address' => PrivacyFingerprint::ip($ip, 'ad-click'),
        ]);
        $this->assertDatabaseMissing('ad_clicks', ['ip_address' => $ip]);
    }

    public function test_catalog_reference_click_is_ignored(): void
    {
        $ad = $this->makeAd(true);

        $this->postJson("/api/ads/{$ad->id}/click", ['channel' => 'share'])
            ->assertOk()
            ->assertJson(['ignored' => true, 'message' => 'Referencia de catálogo']);

        $this->assertDatabaseCount('ad_clicks', 0);
    }

    public function test_catalog_reference_cannot_relay_a_seller_email(): void
    {
        Mail::fake();
        $ad = $this->makeAd(true);

        $this->postJson("/api/ads/{$ad->id}/contact-seller", [
            'name' => 'Comprador de prueba',
            'email' => 'buyer@example.test',
            'message' => 'Quiero información adicional sobre este producto.',
            'website' => '',
        ])->assertNotFound();

        Mail::assertNothingQueued();
    }

    public function test_legacy_api_sitemap_excludes_catalog_references(): void
    {
        Cache::flush();
        $catalog = $this->makeAd(true);
        $genuine = $this->makeAd(false);

        $response = $this->get('/api/sitemap.xml')->assertOk();

        $response->assertDontSee("?ad={$catalog->id}", false);
        $response->assertSee("?ad={$genuine->id}", false);
    }

    public function test_google_merchant_feed_excludes_catalog_references(): void
    {
        Cache::flush();
        $catalog = $this->makeAd(true);
        $genuine = $this->makeAd(false);

        $response = $this->get('/api/google-merchant.xml')->assertOk();

        $response->assertDontSee("<g:id>{$catalog->id}</g:id>", false);
        $response->assertSee("<g:id>{$genuine->id}</g:id>", false);
    }

    private function makeAd(bool $catalog): Ad
    {
        $user = User::factory()->create([
            'email' => uniqid('seller_', true).'@example.test',
        ]);
        $ad = new Ad();
        $ad->forceFill([
            'user_id' => $user->id,
            'title' => 'Artículo de prueba',
            'description' => 'Descripción suficiente para la prueba.',
            'price' => 1000,
            'location' => 'Pachuca de Soto',
            'state' => 'Hidalgo',
            'category' => 'hogar',
            'condition' => 'usado',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => $catalog,
            'views' => 0,
        ])->save();

        return $ad;
    }
}
