<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModerationBypassProtectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_cannot_activate_an_ad_that_is_still_under_moderation(): void
    {
        $seller = User::factory()->create();
        $ad = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $seller->id,
            'title' => 'En revisión',
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
        ]));

        $this->actingAs($seller);

        try {
            $ad->update(['status' => 'active']);
            $this->fail('The owner was able to bypass moderation.');
        } catch (AuthorizationException $error) {
            $this->assertSame('Este anuncio todavía está en revisión.', $error->getMessage());
        }

        $fresh = $ad->fresh();
        $this->assertSame('archived', $fresh->status);
        $this->assertSame('manual_review', $fresh->ai_moderation_status);
    }
}
