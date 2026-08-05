<?php

namespace Tests\Feature;

use App\Http\Middleware\EnforcePaidAdRenewal;
use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdActivationLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_admin_approval_of_pending_ad_publishes_for_seven_days(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        config(['marketplace.ad_lifetime_days' => 7]);
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, ['status' => 'pending']);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('activation_mode', 'automatic_fresh_submission');

        $ad->refresh();
        $this->assertSame('active', $ad->status);
        $this->assertSame('approved', $ad->ai_moderation_status);
        $this->assertTrue($ad->expires_at->equalTo(now()->addDays(7)));

        $decision = AdModerationDecision::query()->where('ad_id', $ad->id)->latest('id')->firstOrFail();
        $this->assertSame('automatic_fresh_submission', $decision->metadata['activation_mode']);
    }

    public function test_admin_approval_of_archived_ad_requires_seller_confirmation(): void
    {
        Carbon::setTestNow('2026-08-05 12:00:00');
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->createAd($seller, [
            'status' => 'archived',
            'expires_at' => now()->subDay(),
            'ai_moderation_status' => 'manual_review',
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'approved',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'archived')
            ->assertJsonPath('activation_mode', 'seller_confirmation_required');

        $ad->refresh();
        $this->assertSame('archived', $ad->status);
        $this->assertSame('approved', $ad->ai_moderation_status);
        $this->assertNull($ad->expires_at);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $seller->id,
            'type' => 'seller_reactivation_ready',
            'link' => '/profile?tab=my_ads&filter=review_ready',
        ]);
    }

    public function test_generic_status_endpoint_cannot_activate_ads(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);
        $archived = $this->createAd($owner, [
            'status' => 'archived',
            'ai_moderation_status' => 'approved',
        ]);
        $pending = $this->createAd($owner, ['status' => 'pending']);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/ads/{$archived->id}/status", ['status' => 'active'])
            ->assertUnprocessable();
        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/ads/{$pending->id}/status", ['status' => 'active'])
            ->assertUnprocessable();

        $this->assertSame('archived', $archived->fresh()->status);
        $this->assertSame('pending', $pending->fresh()->status);
    }

    public function test_paused_reactivation_requires_a_live_expiry(): void
    {
        $this->withoutMiddleware(EnforcePaidAdRenewal::class);
        Carbon::setTestNow('2026-08-05 12:00:00');
        $owner = User::factory()->create();
        $expired = $this->createAd($owner, [
            'status' => 'paused',
            'expires_at' => now()->subMinute(),
        ]);
        $liveExpiry = now()->addDays(2);
        $live = $this->createAd($owner, [
            'status' => 'paused',
            'expires_at' => $liveExpiry,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/ads/{$expired->id}/activate")
            ->assertUnprocessable();
        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/ads/{$live->id}/activate")
            ->assertOk()
            ->assertJsonPath('status', 'active');

        $this->assertSame('paused', $expired->fresh()->status);
        $this->assertSame('active', $live->fresh()->status);
        $this->assertTrue($live->fresh()->expires_at->equalTo($liveExpiry));
    }

    public function test_bulk_activation_rejects_inactive_or_expired_ads_atomically(): void
    {
        $this->withoutMiddleware(EnforcePaidAdRenewal::class);
        Carbon::setTestNow('2026-08-05 12:00:00');
        $owner = User::factory()->create();
        $live = $this->createAd($owner, [
            'status' => 'paused',
            'expires_at' => now()->addDay(),
        ]);
        $inactive = $this->createAd($owner, [
            'status' => 'inactive',
            'expires_at' => null,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/ads/bulk-action', [
                'action' => 'activate',
                'ad_ids' => [$live->id, $inactive->id],
            ])
            ->assertUnprocessable();

        $this->assertSame('paused', $live->fresh()->status);
        $this->assertSame('inactive', $inactive->fresh()->status);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/ads/bulk-action', [
                'action' => 'activate',
                'ad_ids' => [$live->id],
            ])
            ->assertOk()
            ->assertJsonPath('affected', 1);

        $this->assertSame('active', $live->fresh()->status);
    }

    private function createAd(User $seller, array $overrides = []): Ad
    {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Anuncio de ciclo controlado',
            'description' => 'Descripción suficiente para la prueba.',
            'price' => 1500,
            'location' => 'Pachuca de Soto',
            'state' => 'Hidalgo',
            'city' => 'Pachuca de Soto',
            'latitude' => 20.1011,
            'longitude' => -98.7591,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'manual_review',
            ...$overrides,
        ]);
    }
}
