<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GamificationActivityEndpointHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_cannot_submit_server_side_activity_types(): void
    {
        $user = User::factory()->create(['id' => 2000]);
        Sanctum::actingAs($user);

        $this->postJson('/api/gamification/activity', ['type' => 'post'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('type');

        $this->postJson('/api/gamification/activity', ['type' => 'custom-event'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('type');

        $this->assertSame(0, DB::table('activity_streaks')->where('user_id', $user->id)->count());
        $this->assertSame(0, DB::table('user_xp')->where('user_id', $user->id)->count());
    }

    public function test_explicit_login_activity_is_recorded_canonically(): void
    {
        $user = User::factory()->create(['id' => 2000]);
        Sanctum::actingAs($user);

        $this->postJson('/api/gamification/activity', ['type' => 'login'])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(1, DB::table('activity_streaks')
            ->where('user_id', $user->id)
            ->where('activity_type', 'login')
            ->count());
    }

    public function test_omitted_type_defaults_to_canonical_login_activity(): void
    {
        $user = User::factory()->create(['id' => 2000]);
        Sanctum::actingAs($user);

        $this->postJson('/api/gamification/activity')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSame(['login'], DB::table('activity_streaks')
            ->where('user_id', $user->id)
            ->pluck('activity_type')
            ->all());
    }

    public function test_activity_endpoint_enforces_rate_limit(): void
    {
        $user = User::factory()->create(['id' => 3001]);
        Sanctum::actingAs($user);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/gamification/activity')->assertOk();
        }

        $this->postJson('/api/gamification/activity')->assertStatus(429);
        $this->assertSame(1, DB::table('activity_streaks')
            ->where('user_id', $user->id)
            ->where('activity_type', 'login')
            ->count());
    }

    public function test_activity_rate_limit_does_not_consume_payment_bucket(): void
    {
        $user = User::factory()->create(['id' => 3002]);
        Sanctum::actingAs($user);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/gamification/activity')->assertOk();
        }

        $this->postJson('/api/payment/clip', [])->assertStatus(422);
    }

    public function test_activity_endpoint_has_dedicated_rate_limit(): void
    {
        $route = collect(Route::getRoutes()->getRoutes())
            ->first(fn ($route) => $route->uri() === 'api/gamification/activity'
                && in_array('POST', $route->methods(), true));

        $this->assertNotNull($route);
        $this->assertContains('auth:sanctum', $route->gatherMiddleware());
        $this->assertContains('throttle:gamification-activity', $route->gatherMiddleware());
    }
}
