<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
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
        $this->postJson('/api/ads/impressions', [
            'ad_ids' => [$catalog->id, $genuine->id],
            'placement' => 'feed',
        ])->assertOk()->assertJson(['recorded' => 1]);
        $this->assertDatabaseMissing('ad_impressions', ['ad_id' => $catalog->id]);
        $this->assertDatabaseHas('ad_impressions', ['ad_id' => $genuine->id]);
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

    private function makeAd(bool $catalog): Ad
    {
        $user = User::factory()->create(['email' => uniqid('seller_', true).'@example.test']);
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
