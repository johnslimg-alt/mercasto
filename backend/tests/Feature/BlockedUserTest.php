<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BlockedUserTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('blocked_users');
        Schema::dropIfExists('users');

        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();
            $table->string('avatar_url')->nullable();
            $table->string('city')->nullable();
            $table->string('role')->default('individual');
            $table->boolean('is_verified')->default(false);
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();
        });

        Schema::create('blocked_users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blocked_user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'blocked_user_id']);
        });
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('blocked_users');
        Schema::dropIfExists('users');
        parent::tearDown();
    }

    public function test_authenticated_user_can_block_list_and_unblock_another_user(): void
    {
        $user = User::factory()->create();
        $blocked = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/users/{$blocked->id}/block")
            ->assertOk();

        $this->getJson('/api/user/blocked-users')
            ->assertOk()
            ->assertJsonPath('data.0.id', $blocked->id);

        $this->deleteJson("/api/users/{$blocked->id}/block")
            ->assertOk();

        $this->getJson('/api/user/blocked-users')
            ->assertJsonCount(0, 'data');
    }

    public function test_user_cannot_block_their_own_account(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/users/{$user->id}/block")
            ->assertUnprocessable();
    }

    public function test_blocking_requires_authentication(): void
    {
        $blocked = User::factory()->create();

        $this->postJson("/api/users/{$blocked->id}/block")
            ->assertUnauthorized();
    }
}
