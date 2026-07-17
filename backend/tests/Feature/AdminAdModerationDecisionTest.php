<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
