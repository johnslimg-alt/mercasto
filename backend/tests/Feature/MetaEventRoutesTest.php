<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MetaEventRoutesTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_send_post_ad_event(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/post-ad', [
            'event_id' => 'test_post_ad_123',
            'listing_id' => '123',
            'category' => 'Autos',
            'city' => 'Veracruz',
            'url' => 'https://mercasto.com/listings/123',
        ]);

        $response->assertOk();
        $response->assertJsonPath('event_id', 'test_post_ad_123');
    }
}
