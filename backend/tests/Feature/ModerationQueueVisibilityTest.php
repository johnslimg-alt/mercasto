<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModerationQueueVisibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_queue_includes_ai_processing_ads(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'En proceso',
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
            'status' => 'ai_review',
            'moderation_submitted_at' => now()->subMinutes(20),
            'ai_moderation_status' => 'processing',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/moderation/ads')
            ->assertOk()
            ->assertJsonFragment(['id' => $ad->id, 'ai_moderation_status' => 'processing']);
    }
}
