<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminEconomicsMetricsTest extends TestCase
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

    private function createPayment(User $user, array $overrides = []): int
    {
        static $sequence = 1200;
        $sequence++;

        return (int) DB::table('payments')->insertGetId(array_merge([
            'user_id' => $user->id,
            'amount' => 350,
            'description' => 'Boost',
            'status' => 'paid',
            'product_code' => 'boost_1_day',
            'clip_payment_request_id' => 'req-econ-' . $sequence,
            'clip_checkout_id' => 'chk-econ-' . $sequence,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }

    public function test_non_admin_cannot_read_economics(): void
    {
        $user = User::factory()->create(['role' => 'individual']);

        $this->actingAs($user)->getJson('/api/admin/analytics')->assertForbidden();
    }

    public function test_ratios_ignore_catalog_fillers_and_report_missing_sources(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();

        $contacted = $this->createAd($seller, ['is_catalog_filler' => false]);
        // contact_clicks is not mass assignable on the model.
        DB::table('ads')->where('id', $contacted->id)->update(['contact_clicks' => 3]);
        $this->createAd($seller, ['is_catalog_filler' => true]);
        $this->createAd($seller, ['is_catalog_filler' => true]);

        $this->createPayment($seller);
        $this->createPayment($seller, ['status' => 'expired', 'amount' => 500]);
        // Promotion payment for a different product family.
        $this->createPayment($seller, ['product_code' => 'credits_100', 'amount' => 100]);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics');
        $response->assertOk();

        $economics = $response->json('economics');
        $this->assertIsArray($economics);
        $this->assertSame(1, $economics['inventory']['real_listings_total']);
        $this->assertSame(1, $economics['inventory']['sellers_with_listing_total']);
        $this->assertSame(1.0, (float) $economics['funnel']['listing_to_first_contact_rate']);
        $this->assertSame(1.0, (float) $economics['funnel']['seller_activation_rate']);
        $this->assertSame(1.0, (float) $economics['funnel']['free_to_paid_rate']);

        $this->assertSame(2, $economics['revenue']['paid_payments_total']);
        $this->assertSame(450.0, (float) $economics['revenue']['paid_amount_total']);
        $this->assertSame(1, $economics['revenue']['paying_users']);
        $this->assertSame(450.0, (float) $economics['revenue']['arppu']);

        $this->assertSame(1, $economics['promotion']['promotion_payments']);
        $this->assertSame(350.0, (float) $economics['promotion']['promotion_revenue_total']);
        $this->assertSame(1.0, (float) $economics['promotion']['promotion_attach_rate']);

        $this->assertArrayHasKey('cac', $economics['unavailable']);
        $this->assertArrayHasKey('roas', $economics['unavailable']);
        $this->assertArrayHasKey('refund_rate', $economics['unavailable']);
    }

    public function test_median_first_response_uses_the_first_seller_reply(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $ad = $this->createAd($seller, ['is_catalog_filler' => false]);

        $conversationId = (int) DB::table('conversations')->insertGetId([
            'ad_id' => $ad->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'last_message_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('messages')->insert([
            [
                'conversation_id' => $conversationId,
                'sender_id' => $buyer->id,
                'receiver_id' => $seller->id,
                'ad_id' => $ad->id,
                'content' => 'Hola',
                'body' => 'Hola',
                'created_at' => '2026-08-01 10:00:00',
                'updated_at' => '2026-08-01 10:00:00',
            ],
            [
                'conversation_id' => $conversationId,
                'sender_id' => $seller->id,
                'receiver_id' => $buyer->id,
                'ad_id' => $ad->id,
                'content' => 'Buen día',
                'body' => 'Buen día',
                'created_at' => '2026-08-01 10:30:00',
                'updated_at' => '2026-08-01 10:30:00',
            ],
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics');
        $response->assertOk();

        $this->assertSame(30.0, (float) $response->json('economics.funnel.median_first_response_minutes'));
    }

    public function test_median_is_null_when_no_conversation_was_answered(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $buyer = User::factory()->create();
        $ad = $this->createAd($seller, ['is_catalog_filler' => false]);

        $conversationId = (int) DB::table('conversations')->insertGetId([
            'ad_id' => $ad->id,
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'last_message_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('messages')->insert([
            'conversation_id' => $conversationId,
            'sender_id' => $buyer->id,
            'receiver_id' => $seller->id,
            'ad_id' => $ad->id,
            'content' => 'Hola',
            'body' => 'Hola',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/analytics');
        $response->assertOk();

        $this->assertNull($response->json('economics.funnel.median_first_response_minutes'));
    }
}
