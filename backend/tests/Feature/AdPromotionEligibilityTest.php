<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdPromotionEligibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_single_credit_promotion_rejects_unknown_type_before_charging(): void
    {
        $owner = $this->seller();
        $active = $this->ad($owner);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/ads/{$active->id}/promote/credits", ['type' => 'typo'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('type');

        $this->assertSame(200.0, (float) $owner->fresh()->balance);
        $this->assertNull($active->fresh()->promoted);
        $this->assertSame(0, DB::table('ad_promotions')->count());
    }

    public function test_single_credit_promotion_rejects_legacy_featured_marker_before_charging(): void
    {
        $owner = $this->seller();
        $featured = $this->ad($owner, [
            'promoted' => 'destacado',
            'boost_expires_at' => null,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/ads/{$featured->id}/promote/credits", ['type' => 'top'])
            ->assertBadRequest();

        $this->assertSame(200.0, (float) $owner->fresh()->balance);
        $this->assertSame('destacado', $featured->fresh()->promoted);
        $this->assertSame(0, DB::table('ad_promotions')->count());
    }

    public function test_single_credit_promotion_rejects_hidden_listing_before_charging(): void
    {
        Carbon::setTestNow('2026-09-09 02:00:00');
        $owner = $this->seller();
        $archived = $this->ad($owner, ['status' => 'archived', 'expires_at' => null]);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/ads/{$archived->id}/promote/credits", ['type' => 'highlight'])
            ->assertUnprocessable();
        $this->assertSame(200.0, (float) $owner->fresh()->balance);
        $this->assertNull($archived->fresh()->promoted);
        $this->assertSame(0, DB::table('ad_promotions')->count());

        $active = $this->ad($owner);
        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/ads/{$active->id}/promote/credits", ['type' => 'highlight'])
            ->assertOk()
            ->assertJsonPath('promoted', 'highlight');

        $this->assertSame(150.0, (float) $owner->fresh()->balance);
        $this->assertSame('highlight', $active->fresh()->promoted);
        $this->assertSame(1, DB::table('ad_promotions')->where('ad_id', $active->id)->count());
    }

    public function test_bulk_credit_promotion_rejects_mixed_status_selection_atomically(): void
    {
        Carbon::setTestNow('2026-09-09 02:00:00');
        $owner = $this->seller();
        $active = $this->ad($owner);
        $hidden = $this->ad($owner, ['status' => 'archived', 'expires_at' => null]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/ads/promote/credits/bulk', [
                'ad_ids' => [$active->id, $hidden->id],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('invalid_ad_ids.0', $hidden->id);
        $this->assertSame(200.0, (float) $owner->fresh()->balance);
        $this->assertNull($active->fresh()->promoted);
        $this->assertNull($hidden->fresh()->promoted);
        $this->assertSame(0, DB::table('ad_promotions')->count());
    }

    public function test_bulk_credit_promotion_skips_ads_with_an_active_promotion_without_double_charging(): void
    {
        Carbon::setTestNow('2026-09-09 02:00:00');
        $owner = $this->seller();
        $alreadyPromoted = $this->ad($owner, [
            'promoted' => 'highlight',
            'boost_type' => 'highlight_7_days',
            'boost_expires_at' => now()->addDay(),
        ]);
        $fresh = $this->ad($owner);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/ads/promote/credits/bulk', [
                'ad_ids' => [$alreadyPromoted->id, $fresh->id],
            ])
            ->assertOk()
            ->assertJsonPath('promoted_ids.0', $fresh->id)
            ->assertJsonPath('skipped_count', 1);

        $this->assertSame(150.0, (float) $owner->fresh()->balance);
        $this->assertSame('highlight', $alreadyPromoted->fresh()->promoted);
        $fresh = $fresh->fresh();
        $this->assertSame('destacado', $fresh->promoted);
        $this->assertSame('featured_7_days', $fresh->boost_type);
        $this->assertNotNull($fresh->boost_expires_at);
        $this->assertTrue($fresh->boost_expires_at->isFuture());
        $this->assertSame(1, DB::table('ad_promotions')->where('ad_id', $fresh->id)->count());

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/ads/promote/credits/bulk', ['ad_ids' => [$fresh->id]])
            ->assertBadRequest();
        $this->assertSame(150.0, (float) $owner->fresh()->balance);
    }

    private function seller(): User
    {
        return User::factory()->create([
            'balance' => 200,
            'referral_credits' => 0,
            'unlimited_balance' => false,
        ]);
    }

    private function ad(User $owner, array $overrides = []): Ad
    {
        return Ad::query()->create([
            'user_id' => $owner->id,
            'title' => 'Promoción elegible',
            'description' => 'Anuncio de prueba con datos completos.',
            'price' => 1500,
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
