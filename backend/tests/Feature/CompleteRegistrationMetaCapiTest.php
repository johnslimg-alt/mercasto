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
            'services.facebook.access_token' => 'meta-test-token',
            'services.facebook.graph_version' => 'v25.0',
            'services.tiktok.pixel_code' => 'D9C3HKBC77UBS5FSD7C0',
            'services.tiktok.access_token' => 'tiktok-test-token',
            'services.tiktok.events_api_endpoint' => 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        ]);

        Mail::fake();
        Http::fake([
            'graph.facebook.com/*' => Http::response(['events_received' => 1], 200),
            'business-api.tiktok.com/*' => Http::response(['code' => 0, 'message' => 'OK'], 200),
        ]);

        $eventId = 'register_user_123e4567-e89b-12d3-a456-426614174000';
        $email = 'e2e_meta_registration@example.com';
        $phone = '+52 614 123 4567';
        $fbp = 'fb.1.1720000000000.1234567890';
        $fbc = 'fb.1.1720000000000.AbCdEfGhIj';
        $ttp = 'ttp.1720000000000.test';

        $response = $this
            ->withServerVariables(['REMOTE_ADDR' => '203.0.113.7'])
            ->withHeader('User-Agent', 'MercastoMetaTest/1.0')
            ->withHeader('Referer', 'https://mercasto.com/registro?ttclid=tiktok-click')
            ->withHeader('Cookie', "_fbp={$fbp}; _fbc={$fbc}; _ttp={$ttp}")
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

        $this->assertCount(2, $recorded);

        $metaRequest = collect($recorded)->first(fn ($entry) => str_contains($entry[0]->url(), 'graph.facebook.com'))[0];
        $metaEvent = $metaRequest->data()['data'][0] ?? [];
        $metaUserData = $metaEvent['user_data'] ?? [];

        $this->assertSame('CompleteRegistration', $metaEvent['event_name'] ?? null);
        $this->assertSame($eventId, $metaEvent['event_id'] ?? null);
        $this->assertSame(hash('sha256', strtolower(trim($email))), $metaUserData['em'][0] ?? null);
        $this->assertSame(hash('sha256', preg_replace('/\D+/', '', $phone)), $metaUserData['ph'][0] ?? null);
        $this->assertSame(hash('sha256', $userId), $metaUserData['external_id'][0] ?? null);
        $this->assertSame($fbp, $metaUserData['fbp'] ?? null);
        $this->assertSame($fbc, $metaUserData['fbc'] ?? null);

        $tiktokRequest = collect($recorded)->first(fn ($entry) => str_contains($entry[0]->url(), 'business-api.tiktok.com'))[0];
        $tiktokEvent = $tiktokRequest->data()['data'][0] ?? [];
        $tiktokUser = $tiktokEvent['user'] ?? [];

        $this->assertSame('CompleteRegistration', $tiktokEvent['event'] ?? null);
        $this->assertSame(hash('sha256', $eventId), $tiktokEvent['event_id'] ?? null);
        $this->assertSame(hash('sha256', strtolower(trim($email))), $tiktokUser['email'] ?? null);
        $this->assertSame(hash('sha256', '+526141234567'), $tiktokUser['phone'] ?? null);
        $this->assertSame(hash('sha256', $userId), $tiktokUser['external_id'] ?? null);
        $this->assertSame($ttp, $tiktokUser['ttp'] ?? null);
        $this->assertSame('tiktok-click', $tiktokUser['ttclid'] ?? null);
    }

    public function test_registration_without_meta_event_id_does_not_send_complete_registration(): void
    {
        config([
            'services.facebook.pixel_id' => '4595315270748335',
            'services.facebook.access_token' => 'test-token',
            'services.facebook.graph_version' => 'v25.0',
            'services.tiktok.pixel_code' => 'D9C3HKBC77UBS5FSD7C0',
            'services.tiktok.access_token' => 'test-token',
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
