<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SecureOneTimeCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\RefreshDatabaseState;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CompleteRegistrationMetaCapiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Registration vendor egress is an onward transfer to a third party and is both
     * consent-gated and deferred until after commit (the account preference is
     * persisted inside the registration transaction). This class therefore disables
     * the outer test transaction so the afterCommit boundary is real instead of
     * being rolled back, exactly like OpenAiRegistrationAfterCommitTest.
     *
     * @var array<int, string>
     */
    protected $connectionsToTransact = [];

    protected function beforeRefreshingDatabase(): void
    {
        RefreshDatabaseState::$migrated = false;
        RefreshDatabaseState::$inMemoryConnections = [];
    }

    protected function tearDown(): void
    {
        RefreshDatabaseState::$migrated = false;
        RefreshDatabaseState::$inMemoryConnections = [];
        parent::tearDown();
    }

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
                ...$this->registrationConsent(),
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

    public function test_phone_registration_uses_the_same_event_id_for_response_meta_and_tiktok(): void
    {
        config([
            'services.facebook.pixel_id' => '4595315270748335',
            'services.facebook.access_token' => 'meta-test-token',
            'services.facebook.graph_version' => 'v25.0',
            'services.tiktok.pixel_code' => 'D9C3HKBC77UBS5FSD7C0',
            'services.tiktok.access_token' => 'tiktok-test-token',
            'services.tiktok.events_api_endpoint' => 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        ]);
        Http::fake([
            'graph.facebook.com/*' => Http::response(['events_received' => 1], 200),
            'business-api.tiktok.com/*' => Http::response(['code' => 0, 'message' => 'OK'], 200),
        ]);

        $phone = '+525512345690';
        $eventId = 'register_user_phone_shared_event';
        Cache::put(
            SecureOneTimeCode::cacheKey('phone-auth', $phone),
            SecureOneTimeCode::hash('123456', 'phone-auth'),
            now()->addMinutes(10),
        );

        $response = $this->postJson('/api/auth/phone/verify', [
            'phone_number' => $phone,
            'code' => '123456',
            'meta_event_id' => $eventId,
            ...$this->registrationConsent('mobile'),
        ])->assertOk()
            ->assertJsonPath('is_new_user', true)
            ->assertJsonPath('registration_event_id', $eventId)
            ->assertJsonPath('registration_method', 'phone');

        $recorded = Http::recorded();
        $this->assertCount(2, $recorded);
        $metaRequest = collect($recorded)->first(fn ($entry) => str_contains($entry[0]->url(), 'graph.facebook.com'))[0];
        $metaEvent = $metaRequest->data()['data'][0] ?? [];
        $this->assertSame($eventId, $metaEvent['event_id'] ?? null);
        $tiktokRequest = collect($recorded)->first(fn ($entry) => str_contains($entry[0]->url(), 'business-api.tiktok.com'))[0];
        $tiktokEvent = $tiktokRequest->data()['data'][0] ?? [];
        $this->assertSame(hash('sha256', $eventId), $tiktokEvent['event_id'] ?? null);
        $this->assertNotNull($response->json('user.id'));
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
            ...$this->registrationConsent(),
        ])->assertCreated();

        Http::assertNothingSent();
    }

    public function test_registration_without_the_vendor_consent_signal_transmits_nothing(): void
    {
        $this->enableVendorCredentials();

        Mail::fake();
        Http::fake();

        $email = 'e2e_without_vendor_signal@example.com';
        $this->postJson('/api/register', [
            'name' => 'Registration Without Vendor Signal',
            'email' => $email,
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'meta_event_id' => 'register_user_without_vendor_signal',
            ...$this->registrationConsent(),
            // Negative control. The OpenAI-scoped signal is an explicit affirmative
            // so the account preference IS recorded: the only thing missing is the
            // vendor signal, which isolates this gate as the blocker.
            'analytics_tracking_consent' => null,
            'openai_measurement_consent' => true,
        ])->assertCreated();

        $user = User::where('email', $email)->firstOrFail();
        $this->assertTrue(
            (bool) ($user->notification_preferences['analytics_tracking_consent'] ?? false),
            'The account preference must be recorded so the missing signal is the only blocker.',
        );

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'graph.facebook.com')
            || str_contains($request->url(), 'business-api.tiktok.com'));
    }

    public function test_registration_with_a_false_consent_signal_transmits_nothing(): void
    {
        $this->enableVendorCredentials();

        Mail::fake();
        Http::fake();

        $this->postJson('/api/register', [
            'name' => 'Registration With Denied Consent',
            'email' => 'e2e_denied_consent_signal@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'meta_event_id' => 'register_user_denied_consent_signal',
            ...$this->registrationConsent(),
            'analytics_tracking_consent' => false,
        ])->assertCreated();

        Http::assertNothingSent();
    }

    private function enableVendorCredentials(): void
    {
        config([
            'services.facebook.pixel_id' => '4595315270748335',
            'services.facebook.access_token' => 'meta-test-token',
            'services.facebook.graph_version' => 'v25.0',
            'services.tiktok.pixel_code' => 'D9C3HKBC77UBS5FSD7C0',
            'services.tiktok.access_token' => 'tiktok-test-token',
            'services.tiktok.events_api_endpoint' => 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
        ]);
    }

    /** @return array<string, mixed> */
    private function registrationConsent(string $source = 'web'): array
    {
        return [
            'age_confirmed' => true,
            'terms_version' => config('legal.registration_consent.terms_version'),
            'privacy_version' => config('legal.registration_consent.privacy_version'),
            'consent_accepted_at' => now()->toIso8601String(),
            'consent_source' => $source,
            'analytics_tracking_consent' => true,
        ];
    }
}
