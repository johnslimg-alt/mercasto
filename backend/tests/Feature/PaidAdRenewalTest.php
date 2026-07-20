<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaidAdRenewalTest extends TestCase
{
    use RefreshDatabase;

    public function test_ad_model_clamps_free_lifetime_to_seven_days(): void
    {
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'active',
            'expires_at' => now()->addDays(30),
        ]);

        $this->assertNotNull($ad->expires_at);
        $this->assertTrue($ad->expires_at->lte(now()->addDays(7)->addMinute()));
        $this->assertTrue($ad->expires_at->gte(now()->addDays(7)->subMinute()));
    }

    public function test_catalog_filler_ad_stays_active_without_expiry_or_payment(): void
    {
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'active',
            'is_catalog_filler' => true,
            'expires_at' => now()->subDay(),
        ]);

        $this->assertTrue($ad->is_catalog_filler);
        $this->assertNull($ad->expires_at);

        $this->artisan('ads:expire')->assertSuccessful();

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertNull($ad->expires_at);

        Sanctum::actingAs($seller);
        $response = $this->putJson("/api/ads/{$ad->id}/renew");

        $this->assertNotSame(402, $response->status());
        $this->assertDatabaseMissing('payments', [
            'ad_id' => $ad->id,
            'product_code' => 'ad_renewal_7_days',
        ]);
    }

    public function test_expired_ad_requires_fixed_49_mxn_clip_checkout(): void
    {
        config([
            'services.clip.api_key' => 'test-key',
            'services.clip.api_secret' => 'test-secret',
            'marketplace.ad_renewal_price_mxn' => 49,
            'marketplace.ad_renewal_days' => 7,
        ]);

        Http::fake([
            'https://api.payclip.com/v2/checkout' => Http::response([
                'payment_request_id' => 'renewal-request-1',
                'payment_request_url' => 'https://pay.example.test/renewal-request-1',
            ]),
        ]);

        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'expired',
            'expires_at' => now()->subDay(),
        ]);

        Sanctum::actingAs($seller);

        $this->putJson("/api/ads/{$ad->id}/renew")
            ->assertStatus(402)
            ->assertJsonPath('payment_required', true)
            ->assertJsonPath('amount', 49)
            ->assertJsonPath('days', 7)
            ->assertJsonPath('payment_url', 'https://pay.example.test/renewal-request-1');

        $this->assertDatabaseHas('payments', [
            'user_id' => $seller->id,
            'ad_id' => $ad->id,
            'amount' => 49,
            'product_code' => 'ad_renewal_7_days',
            'status' => 'pending',
        ]);

        Http::assertSent(function ($request) use ($ad) {
            return $request->url() === 'https://api.payclip.com/v2/checkout'
                && (float) $request['amount'] === 49.0
                && $request['currency'] === 'MXN'
                && $request['metadata']['ad_id'] === (string) $ad->id;
        });
    }

    public function test_verified_clip_webhook_renews_the_ad_for_seven_days(): void
    {
        config([
            'services.clip.api_key' => 'test-key',
            'services.clip.api_secret' => 'test-secret',
            'marketplace.ad_renewal_price_mxn' => 49,
            'marketplace.ad_renewal_days' => 7,
        ]);

        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'expired',
            'expires_at' => now()->subDay(),
        ]);

        DB::table('payments')->insert([
            'user_id' => $seller->id,
            'ad_id' => $ad->id,
            'clip_checkout_id' => 'clip-renewal-1',
            'clip_payment_request_id' => 'renewal-request-2',
            'amount' => 49,
            'description' => "Renovación de anuncio por 7 días (Anuncio #{$ad->id})",
            'product_code' => 'ad_renewal_7_days',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'https://api.payclip.com/v2/checkout/renewal-request-2' => Http::response([
                'payment_request_id' => 'renewal-request-2',
                'status' => 'completed',
                'amount' => 49,
                'currency' => 'MXN',
            ]),
        ]);

        $this->postJson('/api/webhooks/clip/ad-renewal', [
            'resource' => 'CHECKOUT',
            'resource_status' => 'completed',
            'payment_request_id' => 'renewal-request-2',
            'metadata' => ['external_reference' => 'clip-renewal-1'],
        ])->assertOk()->assertJsonPath('status', 'renewed');

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertTrue($ad->expires_at->gte(now()->addDays(7)->subMinute()));
        $this->assertTrue($ad->expires_at->lte(now()->addDays(7)->addMinute()));

        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => 'renewal-request-2',
            'status' => 'paid',
        ]);
    }

    private function createAd(User $seller, array $overrides = []): Ad
    {
        return Ad::query()->create(array_merge([
            'user_id' => $seller->id,
            'title' => 'Artículo de prueba',
            'description' => 'Descripción de prueba',
            'price' => 100,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'active',
        ], $overrides));
    }
}
