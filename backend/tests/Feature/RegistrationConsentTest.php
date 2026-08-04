<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationConsentTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_records_versioned_legal_consents(): void
    {
        Mail::fake();
        $clientAcceptedAt = '2026-08-03T21:30:00Z';

        $response = $this
            ->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->withHeader('User-Agent', 'MercastoMobile/1.0')
            ->postJson('/api/register', [
                'name' => 'Consent Test',
                'email' => 'e2e_consent@example.com',
                'password' => 'Password123!',
                'password_confirmation' => 'Password123!',
                ...$this->registrationConsent([
                    'consent_accepted_at' => $clientAcceptedAt,
                    'consent_source' => 'mobile',
                ]),
            ]);

        $response->assertCreated()->assertJsonStructure([
            'access_token',
            'user' => ['id', 'email'],
        ]);

        $userId = $response->json('user.id');
        $this->assertDatabaseCount('user_consents', 3);
        $this->assertDatabaseHas('user_consents', [
            'user_id' => $userId,
            'consent_type' => 'age_confirmation',
            'document_version' => config('legal.registration_consent.age_confirmation_version'),
            'source' => 'mobile',
            'ip_hash' => hash('sha256', '203.0.113.10'),
            'user_agent_hash' => hash('sha256', 'MercastoMobile/1.0'),
        ]);
        $this->assertDatabaseHas('user_consents', [
            'user_id' => $userId,
            'consent_type' => 'terms',
            'document_version' => config('legal.registration_consent.terms_version'),
        ]);
        $this->assertDatabaseHas('user_consents', [
            'user_id' => $userId,
            'consent_type' => 'privacy',
            'document_version' => config('legal.registration_consent.privacy_version'),
        ]);

        $user = User::findOrFail($userId);
        $this->assertCount(3, $user->consents);
        $this->assertSame(
            '2026-08-03 21:30:00',
            $user->consents->first()->client_accepted_at->utc()->format('Y-m-d H:i:s'),
        );
        $this->assertNotNull($user->consents->first()->accepted_at);
    }

    public function test_registration_without_consent_is_rejected(): void
    {
        Mail::fake();

        $this->postJson('/api/register', [
            'name' => 'Legacy Client',
            'email' => 'e2e_legacy_consent@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'age_confirmed',
            'terms_version',
            'privacy_version',
            'consent_accepted_at',
            'consent_source',
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'e2e_legacy_consent@example.com',
        ]);
        $this->assertDatabaseCount('user_consents', 0);
    }

    public function test_partial_or_unconfirmed_consent_is_rejected(): void
    {
        Mail::fake();

        $payload = $this->registrationConsent();
        unset($payload['age_confirmed']);

        $this->postJson('/api/register', [
            'name' => 'Invalid Consent',
            'email' => 'e2e_invalid_consent@example.com',
            'password' => 'Password123!',
            ...$payload,
        ])->assertUnprocessable()->assertJsonValidationErrors('age_confirmed');

        $this->assertDatabaseMissing('users', [
            'email' => 'e2e_invalid_consent@example.com',
        ]);
    }

    public function test_confirmed_age_requires_document_versions_and_timestamp(): void
    {
        Mail::fake();

        $this->postJson('/api/register', [
            'name' => 'Missing Versions',
            'email' => 'e2e_missing_versions@example.com',
            'password' => 'Password123!',
            'age_confirmed' => true,
            'consent_source' => 'web',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'terms_version',
            'privacy_version',
            'consent_accepted_at',
        ]);
    }

    public function test_registration_rejects_unknown_document_versions(): void
    {
        Mail::fake();

        $this->postJson('/api/register', [
            'name' => 'Unknown Versions',
            'email' => 'e2e_unknown_versions@example.com',
            'password' => 'Password123!',
            ...$this->registrationConsent([
                'terms_version' => 'old-terms',
                'privacy_version' => 'old-privacy',
            ]),
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'terms_version',
            'privacy_version',
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'e2e_unknown_versions@example.com',
        ]);
    }

    public function test_registration_rejects_a_client_timestamp_too_far_in_the_future(): void
    {
        Mail::fake();
        $maxSkew = (int) config('legal.registration_consent.max_future_skew_minutes', 10);

        $this->postJson('/api/register', [
            'name' => 'Future Consent',
            'email' => 'e2e_future_consent@example.com',
            'password' => 'Password123!',
            ...$this->registrationConsent([
                'consent_accepted_at' => now()
                    ->addMinutes($maxSkew + 1)
                    ->toIso8601String(),
            ]),
        ])->assertUnprocessable()->assertJsonValidationErrors('consent_accepted_at');

        $this->assertDatabaseMissing('users', [
            'email' => 'e2e_future_consent@example.com',
        ]);
    }

    /** @return array<string, mixed> */
    private function registrationConsent(array $overrides = []): array
    {
        return array_replace([
            'age_confirmed' => true,
            'terms_version' => config('legal.registration_consent.terms_version'),
            'privacy_version' => config('legal.registration_consent.privacy_version'),
            'consent_accepted_at' => now()->toIso8601String(),
            'consent_source' => 'web',
        ], $overrides);
    }
}
