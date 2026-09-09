<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GamificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use ReflectionMethod;
use Tests\TestCase;

class GamificationReferralProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_referral_progress_uses_current_referrals_table(): void
    {
        $referrer = User::factory()->create();
        $otherReferrer = User::factory()->create();
        $referred = User::factory()->count(4)->create();

        DB::table('referrals')->insert([
            ['referrer_id' => $referrer->id, 'referred_id' => $referred[0]->id, 'created_at' => now()],
            ['referrer_id' => $referrer->id, 'referred_id' => $referred[1]->id, 'created_at' => now()],
            ['referrer_id' => $referrer->id, 'referred_id' => $referred[2]->id, 'created_at' => now()],
            ['referrer_id' => $otherReferrer->id, 'referred_id' => $referred[3]->id, 'created_at' => now()],
        ]);

        $this->assertFalse(Schema::hasTable('waitlist_subscribers'));
        $this->assertSame(3, $this->progress($referrer, 'referrals_count'));
        $this->assertSame(1, $this->progress($otherReferrer, 'referrals_count'));
    }

    private function progress(User $user, string $type): int
    {
        $method = new ReflectionMethod(GamificationService::class, 'getProgress');
        return $method->invoke(app(GamificationService::class), $user, $type);
    }
}
