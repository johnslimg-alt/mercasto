<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class RegistrationConsentChannelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_phone_account_requires_consent_and_preserves_valid_code_for_retry(): void
    {
        $phone = '+525512345678';
        Cache::put('phone_auth_'.$phone, 123456, now()->addMinutes(10));

        $this->postJson('/api/auth/phone/verify', [
            'phone_number' => $phone,
            'code' => '123456',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'age_confirmed',
            'terms_version',
            'privacy_version',
            'consent_accepted_at',
            'consent_source',
        ]);

        $this->assertSame(123456, Cache::get('phone_auth_'.$phone));
        $this->assertDatabaseMissing('users', ['phone_number' => $phone]);
    }

    public function test_new_phone_account_records_consent_but_existing_user_can_login_without_reaccepting(): void
    {
        $phone = '+525512345679';
        Cache::put('phone_auth_'.$phone, 654321, now()->addMinutes(10));

        $created = $this->postJson('/api/auth/phone/verify', [
            'phone_number' => $phone,
            'code' => '654321',
            ...$this->registrationConsent('mobile'),
        ])->assertOk();

        $userId = $created->json('user.id');
        $this->assertDatabaseCount('user_consents', 3);
        $this->assertDatabaseHas('user_consents', [
            'user_id' => $userId,
            'consent_type' => 'terms',
            'source' => 'mobile',
        ]);

        Cache::put('phone_auth_'.$phone, 111222, now()->addMinutes(10));
        $this->postJson('/api/auth/phone/verify', [
            'phone_number' => $phone,
            'code' => '111222',
        ])->assertOk()->assertJsonPath('user.id', $userId);

        $this->assertDatabaseCount('user_consents', 3);
    }

    public function test_new_telegram_account_requires_consent_and_existing_user_can_login_without_reaccepting(): void
    {
        config(['services.telegram.client_secret' => '123456:test-bot-secret']);
        $authData = [
            'id' => '70001',
            'first_name' => 'Telegram',
            'last_name' => 'User',
            'username' => 'telegram_consent_test',
            'auth_date' => time(),
        ];
        $signed = $this->signedTelegramPayload($authData);

        $this->postJson('/api/auth/telegram/callback', $signed)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('age_confirmed');

        $created = $this->postJson('/api/auth/telegram/callback', [
            ...$signed,
            ...$this->registrationConsent('web'),
        ])->assertOk();

        $userId = $created->json('user.id');
        $this->assertDatabaseCount('user_consents', 3);

        $this->postJson('/api/auth/telegram/callback', $signed)
            ->assertOk()
            ->assertJsonPath('user.id', $userId);
        $this->assertDatabaseCount('user_consents', 3);
    }

    public function test_oauth_registration_redirect_caches_consent_in_one_time_state(): void
    {
        $capturedState = null;
        $provider = Mockery::mock();
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('with')
            ->once()
            ->with(Mockery::on(function (array $parameters) use (&$capturedState): bool {
                $capturedState = $parameters['state'] ?? null;

                return is_string($capturedState) && strlen($capturedState) === 64;
            }))
            ->andReturnSelf();
        $provider->shouldReceive('redirect')
            ->once()
            ->andReturn(redirect()->away('https://accounts.example.test/oauth'));
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/redirect?'.http_build_query([
            'registration' => '1',
            ...$this->registrationConsent('web'),
        ]));

        $response->assertRedirect('https://accounts.example.test/oauth');
        $this->assertNotNull($capturedState);
        $cached = Cache::get("oauth_registration_consent:google:{$capturedState}");
        $this->assertIsArray($cached);
        $this->assertSame(config('legal.registration_consent.terms_version'), $cached['terms_version']);
        $this->assertSame('web', $cached['source']);
    }

    public function test_new_oauth_account_requires_one_time_consent_state(): void
    {
        $this->fakeGoogleUser('google-new-1', 'oauth-new@example.com');

        $response = $this->get('/api/auth/google/callback?code=provider-code');

        $response->assertRedirectContains('error=registration_consent_required');
        $this->assertDatabaseMissing('users', ['email' => 'oauth-new@example.com']);
    }

    public function test_new_oauth_account_consumes_cached_consent_and_existing_user_does_not_need_it_again(): void
    {
        $state = str_repeat('a', 64);
        Cache::put(
            "oauth_registration_consent:google:{$state}",
            [
                'age_confirmation_version' => config('legal.registration_consent.age_confirmation_version'),
                'terms_version' => config('legal.registration_consent.terms_version'),
                'privacy_version' => config('legal.registration_consent.privacy_version'),
                'client_accepted_at' => now()->toIso8601String(),
                'source' => 'web',
            ],
            now()->addMinutes(10),
        );
        $this->fakeGoogleUser('google-new-2', 'oauth-consent@example.com');

        $created = $this->get("/api/auth/google/callback?code=provider-code&state={$state}");

        $created->assertRedirectContains('oauth_code=');
        $user = User::where('email', 'oauth-consent@example.com')->firstOrFail();
        $this->assertSame('google-new-2', $user->google_id);
        $this->assertDatabaseCount('user_consents', 3);
        $this->assertNull(Cache::get("oauth_registration_consent:google:{$state}"));

        $this->fakeGoogleUser('google-new-2', 'oauth-consent@example.com');
        $this->get('/api/auth/google/callback?code=provider-code')
            ->assertRedirectContains('oauth_code=');
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('user_consents', 3);
    }

    /** @return array<string, mixed> */
    private function registrationConsent(string $source): array
    {
        return [
            'age_confirmed' => true,
            'terms_version' => config('legal.registration_consent.terms_version'),
            'privacy_version' => config('legal.registration_consent.privacy_version'),
            'consent_accepted_at' => now()->toIso8601String(),
            'consent_source' => $source,
        ];
    }

    /** @param array<string, mixed> $authData */
    private function signedTelegramPayload(array $authData): array
    {
        $pairs = [];
        foreach ($authData as $key => $value) {
            $pairs[] = $key.'='.$value;
        }
        sort($pairs);
        $secret = hash('sha256', (string) config('services.telegram.client_secret'), true);

        return [
            ...$authData,
            'hash' => hash_hmac('sha256', implode("\n", $pairs), $secret),
        ];
    }

    private function fakeGoogleUser(string $id, string $email): void
    {
        $provider = Mockery::mock();
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn((object) [
            'id' => $id,
            'name' => 'OAuth Consent User',
            'email' => $email,
            'avatar' => null,
        ]);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);
    }
}
