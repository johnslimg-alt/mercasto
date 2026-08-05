<?php

namespace Tests\Feature;

use App\Mail\SellerCorrectionRequiredMail;
use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AdminAdModerationDecisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_rejection_requires_a_reason_and_is_audited(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Anuncio para revisar',
            'description' => 'Descripción',
            'price' => 100,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'archived',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'manual_review',
        ]);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'rejected',
            ])
            ->assertUnprocessable();

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'rejected',
                'reason' => 'El producto está prohibido.',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'rejected');

        $this->assertDatabaseHas('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'source' => 'admin',
            'decision' => 'rejected',
            'moderator_id' => $admin->id,
        ]);
    }

    public function test_admin_can_request_changes_and_seller_is_notified_once(): void
    {
        Mail::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create([
            'email_notifications' => true,
            'notification_preferences' => ['email_alerts' => true],
        ]);
        $ad = $this->reviewAd($seller);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'changes_requested',
            ])
            ->assertUnprocessable();

        $reason = 'Elimina <b>la oferta de desbloqueo</b> y describe solo servicios autorizados.';
        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'changes_requested',
                'reason' => $reason,
            ])
            ->assertOk()
            ->assertJsonPath('status', 'archived')
            ->assertJsonPath('decision', 'changes_requested');

        $ad->refresh();
        $this->assertSame('admin_changes_requested', $ad->ai_moderation_status);
        $this->assertSame(
            'Elimina la oferta de desbloqueo y describe solo servicios autorizados.',
            $ad->ai_moderation_reason,
        );
        $this->assertNull($ad->expires_at);
        $this->assertDatabaseHas('ad_moderation_decisions', [
            'ad_id' => $ad->id,
            'source' => 'admin',
            'decision' => 'changes_requested',
            'moderator_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $seller->id,
            'type' => 'seller_changes_requested',
            'link' => "/anuncio/{$ad->id}/editar",
            'message' => 'Elimina la oferta de desbloqueo y describe solo servicios autorizados.',
        ]);
        Mail::assertQueued(SellerCorrectionRequiredMail::class, 1);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'changes_requested',
                'reason' => 'Aclara los servicios autorizados y elimina cualquier desbloqueo.',
            ])
            ->assertOk();

        $this->assertSame(1, DB::table('user_notifications')
            ->where('user_id', $seller->id)
            ->where('type', 'seller_changes_requested')
            ->where('link', "/anuncio/{$ad->id}/editar")
            ->count());
        Mail::assertQueued(SellerCorrectionRequiredMail::class, 1);
    }

    public function test_active_ad_must_be_paused_before_requesting_changes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = $this->reviewAd($seller, ['status' => 'active', 'expires_at' => now()->addDay()]);

        $this->actingAs($admin)
            ->postJson("/api/admin/moderation/ads/{$ad->id}/decision", [
                'decision' => 'changes_requested',
                'reason' => 'Corrige la descripción.',
            ])
            ->assertUnprocessable();

        $this->assertSame('active', $ad->fresh()->status);
    }

    private function reviewAd(User $seller, array $overrides = []): Ad
    {
        return Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Anuncio para revisar',
            'description' => 'Descripción',
            'price' => 100,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
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
