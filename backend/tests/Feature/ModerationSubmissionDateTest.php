<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModerationSubmissionDateTest extends TestCase
{
    use RefreshDatabase;

    public function test_moderation_submission_date_is_independent_from_creation_date(): void
    {
        $seller = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'Reenviado',
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
            'created_at' => now()->subMonth(),
            'updated_at' => now()->subMonth(),
            'moderation_submitted_at' => now(),
            'ai_moderation_status' => 'queued',
        ]);

        $this->assertNotEquals(
            $ad->created_at->toDateTimeString(),
            $ad->moderation_submitted_at->toDateTimeString()
        );
    }
}
