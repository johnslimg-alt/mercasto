<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class TwoFactorLoginChallengeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_two_factor_code_without_a_first_factor_challenge_is_rejected(): void
    {
        $user = $this->createTwoFactorUser('no-challenge@example.test', 'recovery-no-challenge');

        $this->postJson('/api/login/two-factor', [
            'email' => $user->email,
            'code' => 'recovery-no-challenge',
        ])->assertUnprocessable()->assertJsonValidationErrors('challenge_token');

        $this->assertCount(0, $user->tokens()->get());
    }

    public function test_password_login_issues_a_one_time_challenge_for_recovery_code_login(): void
    {
        $user = $this->createTwoFactorUser('challenge@example.test', 'recovery-challenge');

        $passwordResponse = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'Password123!',
        ])->assertOk()
            ->assertJsonPath('two_factor', true)
            ->assertJsonMissingPath('access_token');

        $this->assertFalse(auth()->check(), 'The first factor must not create an authenticated session.');

        $challenge = $passwordResponse->json('challenge_token');
        $this->assertIsString($challenge);
        $this->assertSame(64, strlen($challenge));

        $this->postJson('/api/login/two-factor', [
            'challenge_token' => $challenge,
            'code' => 'recovery-challenge',
        ])->assertOk()->assertJsonStructure(['access_token', 'user' => ['id', 'email']]);

        $this->assertSame([], json_decode($user->fresh()->two_factor_recovery_codes, true));

        $this->postJson('/api/login/two-factor', [
            'challenge_token' => $challenge,
            'code' => 'recovery-challenge',
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'El desafío de autenticación es inválido o ha expirado.');
    }

    public function test_challenge_is_bound_to_the_user_who_completed_the_first_factor(): void
    {
        $firstUser = $this->createTwoFactorUser('first-factor@example.test', 'first-recovery');
        $secondUser = $this->createTwoFactorUser('other-user@example.test', 'other-recovery');

        $challenge = $this->postJson('/api/login', [
            'email' => $firstUser->email,
            'password' => 'Password123!',
        ])->assertOk()->json('challenge_token');

        $this->postJson('/api/login/two-factor', [
            'email' => $secondUser->email,
            'challenge_token' => $challenge,
            'code' => 'other-recovery',
        ])->assertUnprocessable()->assertJsonPath('message', 'Código 2FA inválido.');

        $this->postJson('/api/login/two-factor', [
            'challenge_token' => $challenge,
            'code' => 'first-recovery',
        ])->assertOk()->assertJsonPath('user.id', $firstUser->id);
    }

    private function createTwoFactorUser(string $email, string $recoveryCode): User
    {
        $user = User::create([
            'name' => '2FA Challenge Test',
            'email' => $email,
            'password' => 'Password123!',
            'role' => 'individual',
            'is_verified' => true,
            'ip_address' => substr(hash('sha256', '127.0.0.1'), 0, 45),
        ]);

        $user->forceFill([
            'email_verified_at' => now(),
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_recovery_codes' => json_encode([$recoveryCode]),
            'two_factor_confirmed_at' => now(),
        ])->save();

        return $user;
    }
}
