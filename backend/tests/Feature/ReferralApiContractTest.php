<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReferralApiContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_invalid_referral_returns_stable_machine_code(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/referral/apply', ['code' => 'UNKNOWN1'])
            ->assertNotFound()
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'invalid_code')
            ->assertJsonStructure(['message']);
    }

    public function test_self_referral_returns_stable_machine_code(): void
    {
        $user = User::factory()->create(['referral_code' => 'SELF1234']);
        Sanctum::actingAs($user);

        $this->postJson('/api/referral/apply', ['code' => 'SELF1234'])
            ->assertStatus(400)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'self_referral')
            ->assertJsonStructure(['message']);
    }

    public function test_existing_referral_returns_stable_machine_code(): void
    {
        $referrer = User::factory()->create(['referral_code' => 'FIRST123']);
        $user = User::factory()->create(['referred_by' => $referrer->id]);
        Sanctum::actingAs($user);

        $this->postJson('/api/referral/apply', ['code' => 'OTHER123'])
            ->assertStatus(400)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'already_applied');
    }

    public function test_valid_referral_returns_applied_code_and_persists_relationship(): void
    {
        $referrer = User::factory()->create(['referral_code' => 'GOOD1234']);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/referral/apply', ['code' => 'GOOD1234'])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('code', 'applied')
            ->assertJsonStructure(['message']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'referred_by' => $referrer->id,
        ]);
        $this->assertDatabaseHas('referrals', [
            'referrer_id' => $referrer->id,
            'referred_id' => $user->id,
        ]);
    }
}
