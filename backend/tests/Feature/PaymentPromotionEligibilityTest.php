<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentPromotionEligibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_balance_promotion_rejects_ineligible_ads_before_charging(): void
    {
        $seller = User::factory()->create(['balance' => 1000]);
        Sanctum::actingAs($seller);

        $cases = [
            ['expires_at' => now()->subMinute()],
            ['is_catalog_filler' => true],
            ['promoted' => 'highlight', 'boost_expires_at' => now()->addDay()],
        ];

        foreach ($cases as $overrides) {
            $ad = $this->ad($seller, $overrides);
            $this->postJson('/api/payment/balance', [
                'description' => 'Destacado 7 días',
                'product_code' => 'featured_7_days',
                'ad_id' => $ad->id,
            ])->assertStatus(400);
        }

        $this->assertSame(1000.0, (float) $seller->fresh()->balance);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('ad_promotions', 0);
    }

    public function test_balance_promotion_charges_eligible_ad_and_persists_expiry(): void
    {
        $seller = User::factory()->create(['balance' => 1000]);
        Sanctum::actingAs($seller);
        $ad = $this->ad($seller);

        $this->postJson('/api/payment/balance', [
            'description' => 'Destacado 7 días',
            'product_code' => 'featured_7_days',
            'ad_id' => $ad->id,
        ])->assertOk();

        $ad->refresh();
        $this->assertSame(851.0, (float) $seller->fresh()->balance);
        $this->assertSame('destacado', $ad->promoted);
        $this->assertSame('featured_7_days', $ad->boost_type);
        $this->assertNotNull($ad->boost_expires_at);
        $this->assertDatabaseHas('ad_promotions', ['ad_id' => $ad->id, 'type' => 'vip']);
        $this->assertDatabaseCount('payments', 1);
    }

    private function ad(User $seller, array $overrides = []): Ad
    {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Promoción por saldo',
            'description' => 'Anuncio de prueba para elegibilidad de pago.',
            'price' => 1200,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'general',
            'condition' => 'usado',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
            'attributes' => [],
            ...$overrides,
        ]);
    }
}
