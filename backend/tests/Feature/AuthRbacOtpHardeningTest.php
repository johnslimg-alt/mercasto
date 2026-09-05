<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SecureOneTimeCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthRbacOtpHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_otp_helper_hashes_and_compares_without_plaintext_storage(): void
    {
        $hash = SecureOneTimeCode::hash('123456', 'contract-test');

        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $hash);
        $this->assertNotSame('123456', $hash);
        $this->assertTrue(SecureOneTimeCode::verify('123456', $hash, 'contract-test'));
        $this->assertFalse(SecureOneTimeCode::verify('123457', $hash, 'contract-test'));
        $this->assertTrue(Schema::hasColumn('users', 'phone_otp_hash'));
    }

    public function test_public_phone_auth_accepts_only_hashed_cached_code(): void
    {
        $phone = '+525551234567';
        $user = User::factory()->create(['phone_number' => $phone]);
        $cacheKey = SecureOneTimeCode::cacheKey('phone-auth', $phone);
        Cache::put($cacheKey, SecureOneTimeCode::hash('654321', 'phone-auth'), now()->addMinutes(10));

        $this->postJson('/api/auth/phone/verify', ['phone_number' => $phone, 'code' => '000000'])
            ->assertStatus(422);

        $this->postJson('/api/auth/phone/verify', ['phone_number' => $phone, 'code' => '654321'])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id);
        $this->assertNull(Cache::get($cacheKey));
    }

    public function test_profile_phone_verification_reads_dedicated_hash_and_clears_it(): void
    {
        $user = User::factory()->create();
        DB::table('users')->where('id', $user->id)->update([
            'phone_number' => '+525559876543',
            'phone_verified' => false,
            'phone_otp' => null,
            'phone_otp_hash' => SecureOneTimeCode::hash('112233', 'profile-phone-verification'),
            'phone_otp_expires_at' => now()->addMinutes(5),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/phone/verify-otp', ['otp' => '000000'])->assertStatus(422);
        $this->postJson('/api/phone/verify-otp', ['otp' => '112233'])->assertOk();

        $stored = DB::table('users')->where('id', $user->id)->first();
        $this->assertTrue((bool) $stored->phone_verified);
        $this->assertNull($stored->phone_otp);
        $this->assertNull($stored->phone_otp_hash);
    }

    public function test_admin_and_category_mutation_boundaries_are_centralized(): void
    {
        $payload = [
            'slug' => 'security-contract',
            'name_es' => 'Contrato',
            'name_en' => 'Contract',
            'icon' => 'shield',
            'sort_order' => 1,
        ];

        $this->getJson('/api/admin/payments')->assertUnauthorized();
        $this->postJson('/api/categories', $payload)->assertUnauthorized();

        $seller = User::factory()->create(['role' => 'individual']);
        Sanctum::actingAs($seller);
        $this->getJson('/api/admin/payments')->assertForbidden();
        $this->postJson('/api/categories', $payload)->assertForbidden();
        $this->assertDatabaseMissing('categories', ['slug' => 'security-contract']);

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->postJson('/api/categories', $payload)->assertCreated();
        $this->assertDatabaseHas('categories', ['slug' => 'security-contract']);
    }

    public function test_public_category_head_request_remains_public(): void
    {
        $this->call('HEAD', '/api/categories')->assertOk();
    }

    public function test_phone_otp_hash_is_hidden_from_user_serialization_and_profile_api(): void
    {
        $user = User::factory()->create();
        DB::table('users')->where('id', $user->id)->update([
            'phone_otp_hash' => SecureOneTimeCode::hash('445566', 'profile-phone-verification'),
        ]);
        $user = $user->fresh();

        $this->assertArrayNotHasKey('phone_otp_hash', $user->toArray());

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/user')->assertOk();
        $this->assertStringNotContainsString('phone_otp_hash', $response->getContent());
    }

    public function test_disabling_two_factor_requires_password_or_valid_second_factor(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Correct-password-2026'),
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_recovery_codes' => json_encode(['recovery-code-123']),
            'two_factor_confirmed_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->deleteJson('/api/user/two-factor-authentication')->assertStatus(422);
        $this->assertNotNull($user->fresh()->two_factor_secret);

        $this->deleteJson('/api/user/two-factor-authentication', ['password' => 'wrong'])
            ->assertStatus(422);
        $this->assertNotNull($user->fresh()->two_factor_secret);

        $this->deleteJson('/api/user/two-factor-authentication', ['password' => 'Correct-password-2026'])
            ->assertOk();
        $this->assertNull($user->fresh()->two_factor_secret);
        $this->assertNull($user->fresh()->two_factor_recovery_codes);
        $this->assertNull($user->fresh()->two_factor_confirmed_at);
    }

    public function test_two_factor_disable_reauthentication_is_rate_limited_per_user(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('Correct-password-2026'),
            'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
            'two_factor_recovery_codes' => json_encode(['recovery-code-123']),
            'two_factor_confirmed_at' => now(),
        ]);
        $rateLimitKey = 'two-factor-disable:user:'.$user->getAuthIdentifier();
        RateLimiter::clear($rateLimitKey);
        Sanctum::actingAs($user);

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->deleteJson('/api/user/two-factor-authentication', ['password' => 'wrong'])
                ->assertStatus(422);
        }

        $this->deleteJson('/api/user/two-factor-authentication', ['password' => 'wrong'])
            ->assertStatus(429)
            ->assertHeader('Retry-After');
        $this->assertNotNull($user->fresh()->two_factor_secret);
        RateLimiter::clear($rateLimitKey);
    }
}
