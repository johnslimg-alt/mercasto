<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\AdModerationDecision;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModerationManualReviewPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_manual_review_keeps_the_ad_record(): void
    {
        $seller = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Pendiente',
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
            'status' => 'pending',
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'manual_review',
        ]);
        $ad->forceFill(['status' => 'pending', 'ai_moderation_status' => 'manual_review'])->saveQuietly();

        AdModerationDecision::create([
            'ad_id' => $ad->id,
            'source' => 'ai',
            'decision' => 'manual_review',
            'reason' => 'Requiere revisión humana.',
        ]);

        $this->assertDatabaseHas('ads', ['id' => $ad->id, 'status' => 'pending']);
        $this->assertDatabaseHas('ad_moderation_decisions', ['ad_id' => $ad->id, 'decision' => 'manual_review']);
    }
}
