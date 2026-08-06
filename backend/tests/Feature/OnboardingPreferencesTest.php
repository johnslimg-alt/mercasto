<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OnboardingPreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_persist_skipped_onboarding_state(): void
    {
        $user = User::factory()->create([
            'onboarding_completed_at' => now()->subDay(),
        ]);
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/user/preferences', [
            'preferred_role' => 'seller',
            'preferred_categories' => ['motor', 'servicios'],
            'onboarding_skipped_at' => now()->toIso8601String(),
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.preferred_role', 'seller')
            ->assertJsonPath('data.preferred_categories.0', 'motor')
            ->assertJsonPath('data.onboarding_completed_at', null);

        $user->refresh();
        $this->assertNull($user->onboarding_completed_at);
        $this->assertNotNull($user->onboarding_skipped_at);
    }

    public function test_completed_onboarding_clears_previous_skip_state(): void
    {
        $user = User::factory()->create([
            'onboarding_skipped_at' => now()->subDay(),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/user/preferences', [
            'preferred_role' => 'both',
            'preferred_categories' => [],
            'onboarding_completed_at' => now()->toIso8601String(),
        ])->assertOk()
            ->assertJsonPath('data.preferred_role', 'both')
            ->assertJsonPath('data.onboarding_skipped_at', null);

        $user->refresh();
        $this->assertNotNull($user->onboarding_completed_at);
        $this->assertNull($user->onboarding_skipped_at);
    }

    public function test_onboarding_rejects_unknown_role_values(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/user/preferences', [
            'preferred_role' => 'admin',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('preferred_role');

        $this->assertNull($user->fresh()->preferred_role);
    }
}
