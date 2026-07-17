<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAdModerationRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_cannot_open_moderation_queue(): void
    {
        $user = User::factory()->create(['role' => 'individual']);

        $this->actingAs($user)
            ->getJson('/api/admin/moderation/ads')
            ->assertForbidden();
    }

    public function test_admin_sees_oldest_pending_ad_first(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();

        $newer = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Nuevo',
            'description' => 'Anuncio reciente',
            'price' => 100,
            'location' => 'Veracruz',
            'category' => 'general',
            'status' => 'pending',
            'moderation_submitted_at' => now()->subHour(),
        ]);
        $older = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Antiguo',
            'description' => 'Anuncio antiguo',
            'price' => 100,
            'location' => 'Veracruz',
            'category' => 'general',
            'status' => 'pending',
            'moderation_submitted_at' => now()->subDays(2),
        ]);

        // Observers claim new records for AI. Restore deterministic queue states for this API test.
        $newer->forceFill(['status' => 'pending', 'ai_moderation_status' => 'manual_review'])->saveQuietly();
        $older->forceFill(['status' => 'pending', 'ai_moderation_status' => 'manual_review'])->saveQuietly();

        $this->actingAs($admin)
            ->getJson('/api/admin/moderation/ads')
            ->assertOk()
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id);
    }
}
