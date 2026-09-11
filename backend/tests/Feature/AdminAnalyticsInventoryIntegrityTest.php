<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminAnalyticsInventoryIntegrityTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_non_admin_cannot_read_analytics(): void
    {
        $user = User::factory()->create(['role' => 'individual']);

        $this->actingAs($user)
            ->getJson('/api/admin/analytics')
            ->assertForbidden();
    }

    public function test_catalog_placeholders_are_reported_apart_from_seller_inventory(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();

        $real = $this->createAd($seller, [
            'title' => 'Anuncio real',
            'is_catalog_filler' => false,
            'promoted' => 'destacado',
            'boost_expires_at' => now()->addYear(),
        ]);
        $filler = $this->createAd($seller, [
            'title' => 'Filler con promoción',
            'is_catalog_filler' => true,
            'promoted' => 'destacado',
            'boost_expires_at' => now()->addYear(),
        ]);
        $this->createAd($seller, [
            'title' => 'Filler simple',
            'is_catalog_filler' => true,
        ]);

        DB::table('ad_impressions')->insert([
            ['ad_id' => $real->id, 'placement' => 'catalog', 'created_at' => now(), 'updated_at' => now()],
            ['ad_id' => $filler->id, 'placement' => 'catalog', 'created_at' => now(), 'updated_at' => now()],
            ['ad_id' => $filler->id, 'placement' => 'listing', 'created_at' => now(), 'updated_at' => now()],
        ]);
        DB::table('ad_clicks')->insert([
            ['ad_id' => $real->id, 'channel' => 'whatsapp', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics');
        $response->assertOk();

        $integrity = $response->json('inventory_integrity');
        $this->assertIsArray($integrity);
        $this->assertSame(1, $integrity['active_ads_real']);
        $this->assertSame(2, $integrity['active_ads_catalog']);
        $this->assertSame(1, $integrity['promoted_ads_real']);
        $this->assertSame(1, $integrity['promoted_ads_catalog']);
        $this->assertSame(1, $integrity['impressions_real']);
        $this->assertSame(2, $integrity['impressions_catalog']);
        $this->assertSame(1, $integrity['clicks_real']);
        $this->assertSame(0, $integrity['clicks_catalog']);
        $this->assertSame(100.0, (float) $integrity['ctr_real']);
        $this->assertSame(1, (int) $integrity['real_ads_by_status']['active']);

        // Headline keys keep their existing meaning (they count everything).
        $this->assertSame(3, $response->json('active_ads'));
        $this->assertSame(2, (int) $response->json('active_promoted_ads'));
        $this->assertSame(3, $response->json('total_impressions'));
        $this->assertSame(1, $response->json('total_clicks'));
    }
}
