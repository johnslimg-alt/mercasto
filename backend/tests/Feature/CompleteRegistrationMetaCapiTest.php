<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CompleteRegistrationMetaCapiTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_complete_registration_with_created_user_and_shared_event_id(): void
    {
        config([
            'services.facebook.pixel_id' => '4595315270748335',
            'services.facebook.access_token' => 'test-token',
            'services.facebook.graph_version' => 'v25.0',
        ]);

        Mail::fake();
        Http::fake([
            'graph.facebook.com/*' => Http::response(['events_received' => 1], 200),
        ]);

        $eventId = 'register_user_123e4567-e89b-12d3-a456-426614174000';
        $email = 'e2e_meta_registration@example.com';
        $phone = '+52 614 123 4567';
        $fbp = 'fb.1.1720000000000.1234567890';
        $fbc = 'fb.1.1720000000000.AbCdEfGhIj';

        $response = $this
            ->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
            ->withHeader('User-Agent', 'MercastoMetaTest/1.0')
            ->withHeader('Referer', 'https://mercasto.com/registro')
            ->withUnencryptedCookies([
                '_fbp' => $fbp,
                '_fbc' => $fbc,
            ])
            ->postJson('/api/register', [
                'name' => 'Meta Registration Test',
                'email' => $email,
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                'phone_number' => $phone,
                'meta_event_id' => $eventId,
            ]);

        $response->assertCreated();
        $userId = (string) $response->json('user.id');
        $recorded = Http::recorded();

        $this->assertCount(1, $recorded);

        [$request] = $recorded[0];
        $payload = $request->data();
        $event = $payload['data'][0] ?? [];
        $userData = $event['user_data'] ?? [];

        $this->assertStringContainsString('/4595315270748335/events', $request->url());
        $this->assertSame('CompleteRegistration', $event['event_name'] ?? null);
        $this->assertSame($eventId, $event['event_id'] ?? null);
        $this->assertSame('website', $event['action_source'] ?? null);
        $this->assertSame('https://mercasto.com/registro', $event['event_source_url'] ?? null);
        $this->assertSame(hash('sha256', strtolower(trim($email))), $userData['em'][0] ?? null);
        $this->assertSame(hash('sha256', preg_replace('/\D+/', '', $phone)), $userData['ph'][0] ?? null);
        $this->assertSame(hash('sha256', $userId), $userData['external_id'][0] ?? null);
        $this->assertNotEmpty($userData['client_ip_address'] ?? null);
        $this->assertSame('MercastoMetaTest/1.0', $userData['client_user_agent'] ?? null);
        $this->assertSame($fbp, $userData['fbp'] ?? null);
        $this->assertSame($fbc, $userData['fbc'] ?? null);
    }

    public function test_registration_without_meta_event_id_does_not_send_complete_registration(): void
    {
        config([
            'services.facebook.pixel_id' => '4595315270748335',
            'services.facebook.access_token' => 'test-token',
            'services.facebook.graph_version' => 'v25.0',
        ]);

        Mail::fake();
        Http::fake();

        $this->postJson('/api/register', [
            'name' => 'Registration Without Meta Event',
            'email' => 'e2e_without_meta_event@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertCreated();

        Http::assertNothingSent();
    }
}
