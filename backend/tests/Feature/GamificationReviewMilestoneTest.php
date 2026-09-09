<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GamificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class GamificationReviewMilestoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_review_achievements_use_received_reviews_and_five_star_ratings(): void
    {
        $seller = User::factory()->create(['id' => 2000]);
        $reviewers = User::factory()->count(5)->create();

        foreach ($reviewers as $reviewer) {
            DB::table('reviews')->insert([
                'reviewer_id' => $reviewer->id,
                'seller_id' => $seller->id,
                'rating' => 5,
                'comment' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $unlocked = app(GamificationService::class)->checkAchievements($seller);
        $slugs = collect($unlocked)->pluck('slug')->all();

        $this->assertContains('first_review', $slugs);
        $this->assertContains('trusted_seller', $slugs);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $seller->id,
            'achievement_id' => DB::table('achievements')->where('slug', 'trusted_seller')->value('id'),
            'progress' => 5,
            'unlocked' => true,
        ]);
    }

    public function test_user_position_is_lower_is_better_and_locked_progress_is_not_fake_complete(): void
    {
        $user = User::factory()->create(['id' => 150]);

        app(GamificationService::class)->checkAchievements($user);

        $earlyId = DB::table('achievements')->where('slug', 'early_adopter')->value('id');
        $pioneerId = DB::table('achievements')->where('slug', 'pioneer')->value('id');

        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => $earlyId,
            'progress' => 0,
            'unlocked' => false,
        ]);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => $pioneerId,
            'progress' => 1000,
            'unlocked' => true,
        ]);
    }

    public function test_successful_login_records_daily_activity_and_syncs_milestones(): void
    {
        $user = User::factory()->create([
            'id' => 150,
            'password' => Hash::make('secret_password'),
        ]);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'secret_password',
        ])->assertOk();

        $this->assertDatabaseHas('user_xp', [
            'user_id' => $user->id,
            'current_streak' => 1,
        ]);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $user->id,
            'achievement_id' => DB::table('achievements')->where('slug', 'pioneer')->value('id'),
            'unlocked' => true,
        ]);
    }

    public function test_authentication_stays_successful_when_gamification_sync_fails(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('secret_password'),
        ]);

        $this->app->instance(GamificationService::class, new class extends GamificationService {
            public function recordActivity(User $user, string $type = 'login'): array
            {
                throw new RuntimeException('synthetic gamification failure');
            }
        });

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'secret_password',
        ])->assertOk()->assertJsonStructure(['access_token', 'user']);
    }

    public function test_review_submission_unlocks_seller_review_achievement_immediately(): void
    {
        $seller = User::factory()->create(['id' => 2000]);
        $reviewer = User::factory()->create();
        $adId = DB::table('ads')->insertGetId([
            'user_id' => $seller->id,
            'title' => 'Seller listing',
            'description' => null,
            'price' => 100,
            'location' => 'Veracruz',
            'category' => 'motor',
            'image_url' => null,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('favorites')->insert([
            'user_id' => $reviewer->id,
            'ad_id' => $adId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($reviewer);

        $this->postJson("/api/users/{$seller->id}/reviews", [
            'rating' => 5,
            'comment' => 'Todo bien',
        ])->assertOk();

        $this->assertDatabaseHas('reviews', [
            'reviewer_id' => $reviewer->id,
            'seller_id' => $seller->id,
            'rating' => 5,
        ]);
        $this->assertDatabaseHas('user_achievements', [
            'user_id' => $seller->id,
            'achievement_id' => DB::table('achievements')->where('slug', 'first_review')->value('id'),
            'unlocked' => true,
        ]);
    }

    public function test_review_save_stays_successful_when_gamification_sync_fails(): void
    {
        $seller = User::factory()->create(['id' => 2000]);
        $reviewer = User::factory()->create();
        $adId = DB::table('ads')->insertGetId([
            'user_id' => $seller->id,
            'title' => 'Seller listing',
            'description' => null,
            'price' => 100,
            'location' => 'Veracruz',
            'category' => 'motor',
            'image_url' => null,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('favorites')->insert([
            'user_id' => $reviewer->id,
            'ad_id' => $adId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->app->instance(GamificationService::class, new class extends GamificationService {
            public function checkAchievements(User $user): array
            {
                throw new RuntimeException('synthetic gamification failure');
            }
        });
        Sanctum::actingAs($reviewer);

        $this->postJson("/api/users/{$seller->id}/reviews", [
            'rating' => 5,
            'comment' => 'Todo bien',
        ])->assertOk();

        $this->assertDatabaseHas('reviews', [
            'reviewer_id' => $reviewer->id,
            'seller_id' => $seller->id,
            'rating' => 5,
        ]);
    }

}
