<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserReturnRetentionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_authenticated_activity_records_only_the_first_return_after_24_hours(): void
    {
        Carbon::setTestNow('2026-08-14 18:00:00');
        $user = User::factory()->create([
            'created_at' => now()->subDays(2),
            'first_return_after_24h_at' => null,
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/user')->assertOk();
        $this->assertStringNotContainsString('first_return_after_24h_at', $response->getContent());
        $firstReturn = $user->fresh()->first_return_after_24h_at;
        $this->assertNotNull($firstReturn);
        $this->assertSame('2026-08-14 18:00:00', $firstReturn->format('Y-m-d H:i:s'));

        Carbon::setTestNow('2026-08-14 20:05:00');
        $this->getJson('/api/user')->assertOk();
        $this->assertSame(
            $firstReturn->format('Y-m-d H:i:s'),
            $user->fresh()->first_return_after_24h_at?->format('Y-m-d H:i:s'),
        );
    }

    public function test_activity_inside_first_24_hours_does_not_count_as_return(): void
    {
        Carbon::setTestNow('2026-08-14 18:00:00');
        $user = User::factory()->create([
            'created_at' => now()->subHours(12),
            'first_return_after_24h_at' => null,
        ]);
        Sanctum::actingAs($user);

        $this->getJson('/api/user')->assertOk();

        $this->assertNull($user->fresh()->first_return_after_24h_at);
    }
}
