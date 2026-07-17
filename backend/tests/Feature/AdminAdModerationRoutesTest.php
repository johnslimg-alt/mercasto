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
        $base = [
            'user_id' => $seller->id,
            'description' => 'Descripción de prueba',
            'price' => 100,
            'location' => 'Veracruz, Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'general',
            'subcategory' => 'general',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'general'],
            'status' => 'pending',
            'ai_moderation_status' => 'manual_review',
        ];

        [$newer, $older] = Ad::withoutEvents(function () use ($base) {
            $newer = Ad::query()->create($base + [
                'title' => 'Nuevo',
                'moderation_submitted_at' => now()->subHour(),
            ]);
            $older = Ad::query()->create($base + [
                'title' => 'Antiguo',
                'moderation_submitted_at' => now()->subDays(2),
            ]);

            return [$newer, $older];
        });

        $this->actingAs($admin)
            ->getJson('/api/admin/moderation/ads')
            ->assertOk()
            ->assertJsonPath('data.0.id', $older->id)
            ->assertJsonPath('data.1.id', $newer->id);
    }
}
