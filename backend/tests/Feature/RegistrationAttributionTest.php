<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserRegistrationAttribution;
use App\Support\RegistrationAttribution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RegistrationAttributionTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_registration_persists_campaign_and_first_touch_attribution(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Attributed Seller',
            'email' => 'e2e_attributed@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            ...$this->registrationConsent(),
            ...$this->attribution([
                'attribution_source' => 'facebook',
                'attribution_medium' => 'paid_social',
                'attribution_campaign' => 'verano_2026',
                'attribution_content' => 'carrusel_a',
                'attribution_term' => 'autos-usados',
                'attribution_click_platform' => 'meta',
                'attribution_paid' => true,
                'attribution_landing_path' => '/autos?utm_source=facebook',
                'first_touch_source' => 'google',
                'first_touch_medium' => 'cpc',
                'first_touch_campaign' => 'marca_2026',
                'first_touch_landing_path' => '/',
                'first_touch_paid' => true,
            ]),
        ]);

        $response->assertCreated();
        $userId = $response->json('user.id');

        $this->assertDatabaseCount('user_registration_attributions', 1);
        $this->assertDatabaseHas('user_registration_attributions', [
            'user_id' => $userId,
            'registration_method' => 'email',
            'attribution_source' => 'facebook',
            'attribution_medium' => 'paid_social',
            'attribution_campaign' => 'verano_2026',
            'attribution_content' => 'carrusel_a',
            'attribution_click_platform' => 'meta',
            'attribution_paid' => true,
            'attribution_landing_path' => '/autos?utm_source=facebook',
            'first_touch_source' => 'google',
            'first_touch_campaign' => 'marca_2026',
            'first_touch_paid' => true,
        ]);

        $attribution = User::findOrFail($userId)->registrationAttribution;
        $this->assertNotNull($attribution);
        $this->assertSame('email', $attribution->registration_method);
        $this->assertNotNull($attribution->attribution_captured_at);
    }

    public function test_registration_without_attribution_records_method_without_inventing_a_campaign(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Organic Seller',
            'email' => 'e2e_organic@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            ...$this->registrationConsent(),
        ]);

        $response->assertCreated();
        $userId = $response->json('user.id');

        $this->assertDatabaseHas('user_registration_attributions', [
            'user_id' => $userId,
            'registration_method' => 'email',
            'attribution_campaign' => null,
            'attribution_source' => null,
            'attribution_paid' => false,
        ]);
    }

    public function test_failed_registration_records_no_attribution(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/register', [
            'name' => 'Rejected Seller',
            'email' => 'not-an-email',
            'password' => 'short',
            ...$this->registrationConsent(),
            ...$this->attribution(['attribution_campaign' => 'should_not_persist']),
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('user_registration_attributions', 0);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_unknown_and_oversized_attribution_values_are_dropped_or_capped(): void
    {
        $record = RegistrationAttribution::fromArray([
            'attribution_campaign' => str_repeat('c', 400),
            'attribution_source' => "  facebook\n\t ",
            'attribution_paid' => 1,
            'attribution_ai_referral' => '1',
            'first_touch_paid' => '0',
            'attribution_captured_at' => now()->subDay()->toIso8601String(),
            'user_id' => 12345,
            'email' => 'leak@example.com',
            'arbitrary' => 'nope',
        ]);

        $this->assertSame(180, mb_strlen($record['attribution_campaign']));
        $this->assertSame('facebook', $record['attribution_source']);
        $this->assertTrue($record['attribution_paid']);
        $this->assertTrue($record['attribution_ai_referral']);
        $this->assertFalse($record['first_touch_paid']);
        $this->assertArrayNotHasKey('user_id', $record);
        $this->assertArrayNotHasKey('email', $record);
        $this->assertArrayNotHasKey('arbitrary', $record);

        // Unparseable booleans are dropped rather than guessed.
        $this->assertArrayNotHasKey(
            'attribution_paid',
            RegistrationAttribution::fromArray(['attribution_paid' => 'yes']),
        );
    }

    public function test_captured_at_outside_the_trusted_window_is_rejected(): void
    {
        $future = RegistrationAttribution::fromArray([
            'attribution_captured_at' => now()->addHour()->toIso8601String(),
        ]);
        $stale = RegistrationAttribution::fromArray([
            'attribution_captured_at' => now()->subDays(60)->toIso8601String(),
        ]);
        $valid = RegistrationAttribution::fromArray([
            'attribution_captured_at' => now()->subDay()->toIso8601String(),
        ]);

        $this->assertArrayNotHasKey('attribution_captured_at', $future);
        $this->assertArrayNotHasKey('attribution_captured_at', $stale);
        $this->assertArrayHasKey('attribution_captured_at', $valid);
    }

    public function test_only_filters_a_mixed_oauth_consent_payload(): void
    {
        $filtered = RegistrationAttribution::only([
            'terms_version' => '2026-08-03',
            'consent_source' => 'web',
            'meta_event_id' => 'register_user_abc',
            'attribution_campaign' => 'oauth_campaign',
            'first_touch_campaign' => 'oauth_first',
        ]);

        $this->assertSame([
            'attribution_campaign' => 'oauth_campaign',
            'first_touch_campaign' => 'oauth_first',
        ], $filtered);
    }

    public function test_registration_method_is_derived_from_the_endpoint(): void
    {
        $this->assertSame('email', RegistrationAttribution::methodFor(request()->create('/api/register', 'POST')));
        $this->assertSame('phone', RegistrationAttribution::methodFor(request()->create('/api/auth/phone/verify', 'POST')));
        $this->assertSame('telegram', RegistrationAttribution::methodFor(request()->create('/api/auth/telegram/callback', 'POST')));
        $this->assertSame('google', RegistrationAttribution::methodFor(request()->create('/api/auth/google/callback', 'GET')));
        $this->assertNull(RegistrationAttribution::methodFor(request()->create('/api/login', 'POST')));
    }

    public function test_login_and_other_endpoints_never_write_attribution(): void
    {
        Mail::fake();

        $this->postJson('/api/register', [
            'name' => 'Login Fixture',
            'email' => 'e2e_login_fixture@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            ...$this->registrationConsent(),
        ])->assertCreated();

        $this->assertDatabaseCount('user_registration_attributions', 1);

        $this->postJson('/api/login', [
            'email' => 'e2e_login_fixture@example.com',
            'password' => 'Password123!',
        ])->assertOk();

        // A login must not create a second attribution row or overwrite the first.
        $this->assertDatabaseCount('user_registration_attributions', 1);
        $this->assertDatabaseHas('user_registration_attributions', [
            'registration_method' => 'email',
        ]);
    }

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

    private function attribution(array $overrides = []): array
    {
        return array_replace([
            'attribution_captured_at' => now()->toIso8601String(),
        ], $overrides);
    }
}
