<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountDeletionReauthTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_account_cannot_be_deleted_without_current_password(): void
    {
        $user = User::factory()->create(['password' => 'Correct-password-2026']);

        $this->actingAs($user, 'sanctum')->deleteJson('/api/user')
            ->assertStatus(422)
            ->assertJsonPath('code', 'password_confirmation_required');

        $this->actingAs($user, 'sanctum')->deleteJson('/api/user', ['password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'password_confirmation_required');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_passwordless_account_requires_recent_real_access_token(): void
    {
        $user = User::factory()->create(['password' => null]);

        $this->actingAs($user, 'sanctum')->deleteJson('/api/user')
            ->assertStatus(403)
            ->assertJsonPath('code', 'reauthentication_required');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_account_delete_route_uses_sensitive_profile_rate_limit(): void
    {
        $route = collect(app('router')->getRoutes()->getRoutes())->first(
            fn ($route) => $route->uri() === 'api/user' && in_array('DELETE', $route->methods(), true)
        );

        $this->assertNotNull($route);
        $this->assertContains('throttle:sensitive-profile', $route->gatherMiddleware());
    }
}
