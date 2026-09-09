<?php

namespace Tests\Feature;

use App\Models\Achievement;
use App\Models\User;
use App\Services\GamificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class GamificationSchemaAdoptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_fresh_migrations_expose_the_runtime_achievement_schema(): void
    {
        foreach (['slug', 'name', 'description', 'icon', 'category', 'rarity', 'xp_reward', 'requirement_type', 'requirement_value', 'is_active', 'sort_order'] as $column) {
            $this->assertTrue(Schema::hasColumn('achievements', $column), "Missing achievements.{$column}");
        }

        foreach (['key', 'name_en', 'name_es', 'name_pt', 'description_en', 'description_es', 'description_pt', 'requirement', 'is_secret'] as $legacyColumn) {
            $this->assertFalse(Schema::hasColumn('achievements', $legacyColumn), "Legacy achievements.{$legacyColumn} is still present");
        }

        $this->assertSame(16, Achievement::query()->where('is_active', true)->count());
        $this->assertSame('common', Achievement::query()->where('slug', 'first_blood')->value('rarity'));
        $this->assertSame(100, Achievement::query()->where('slug', 'viral_legend')->value('requirement_value'));
    }

    public function test_fresh_schema_runs_the_full_achievement_progress_loop(): void
    {
        $user = User::factory()->create();

        $unlocked = app(GamificationService::class)->checkAchievements($user);

        $this->assertSame([], $unlocked);
        $this->assertSame(16, DB::table('user_achievements')->where('user_id', $user->id)->count());
        $this->assertSame(0, DB::table('user_achievements')->where('user_id', $user->id)->where('unlocked', true)->count());
    }
}
