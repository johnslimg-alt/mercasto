<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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

    public function test_guest_can_send_contact_event(): void
    {
        $response = $this->postJson('/api/meta/events/contact', [
            'event_id' => 'test_contact_123',
            'listing_id' => '123',
            'category' => 'Autos',
            'city' => 'Veracruz',
            'method' => 'whatsapp',
            'url' => 'https://mercasto.com/listings/123',
        ]);

        $response->assertOk();
        $response->assertJsonPath('event_id', 'test_contact_123');
    }

    public function test_post_ad_sends_deduplicated_openai_custom_conversion_when_consented(): void
    {
        config([
            'services.openai_ads.pixel_id' => 'px_post_ad_test',
            'services.openai_ads.api_key' => 'test-key',
            'services.openai_ads.events_api_endpoint' => 'https://bzr.openai.com/v1/events',
            'app.frontend_url' => 'https://mercasto.com',
        ]);
        Http::fake(['bzr.openai.com/*' => Http::response(['accepted' => 1], 200)]);
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/post-ad', [
            'event_id' => 'listing_publish_shared_123',
            'listing_id' => '123',
            'category' => 'Autos',
            'city' => 'Veracruz',
            'url' => 'https://mercasto.com/listings/123?utm_source=test#done',
            'openai_measurement_consent' => true,
        ])->assertOk()->assertJsonPath('openai_ok', true);

        Http::assertSent(function ($request) use ($response) {
            if (! str_contains($request->url(), 'bzr.openai.com')) {
                return false;
            }
            $event = $request->data()['events'][0] ?? [];
            $this->assertSame($response->json('event_id'), $event['id'] ?? null);
            $this->assertSame('custom', $event['type'] ?? null);
            $this->assertSame('listing_published', $event['custom_event_name'] ?? null);
            $this->assertSame('custom', $event['data']['type'] ?? null);
            $this->assertSame('https://mercasto.com/listings/123', $event['source_url'] ?? null);
            return true;
        });
    }

    public function test_contact_click_does_not_become_openai_lead_conversion(): void
    {
        config([
            'services.openai_ads.pixel_id' => 'px_contact_test',
            'services.openai_ads.api_key' => 'test-key',
            'services.openai_ads.events_api_endpoint' => 'https://bzr.openai.com/v1/events',
        ]);
        Http::fake();

        $this->postJson('/api/meta/events/contact', [
            'event_id' => 'contact_not_a_lead_123',
            'listing_id' => '123',
            'method' => 'whatsapp',
            'url' => 'https://mercasto.com/listings/123',
            'openai_measurement_consent' => true,
        ])->assertOk()->assertJsonPath('openai_ok', false);

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'bzr.openai.com'));
    }
}
