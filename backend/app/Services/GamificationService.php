<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GamificationService
{
    /**
     * Award XP to a user
     */
    public function awardXp(User $user, int $amount, string $reason, ?string $refType = null, ?int $refId = null): array
    {
        $userXp = DB::table('user_xp')->where('user_id', $user->id)->first();

        if (!$userXp) {
            DB::table('user_xp')->insert([
                'user_id' => $user->id,
                'total_xp' => $amount,
                'level' => 1,
                'current_streak' => 0,
                'longest_streak' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            DB::table('user_xp')->where('user_id', $user->id)->update([
                'total_xp' => $userXp->total_xp + $amount,
                'last_xp_gain_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Log transaction
        DB::table('xp_transactions')->insert([
            'user_id' => $user->id,
            'amount' => $amount,
            'reason' => $reason,
            'reference_type' => $refType,
            'reference_id' => $refId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Recalculate level
        $newTotal = ($userXp ? $userXp->total_xp : 0) + $amount;
        $levelData = Achievement::getLevelForXp($newTotal);

        DB::table('user_xp')->where('user_id', $user->id)->update([
            'level' => $levelData['level'],
        ]);

        return [
            'xp_gained' => $amount,
            'total_xp' => $newTotal,
            'level' => $levelData['level'],
            'level_name' => $levelData['name'],
            'level_up' => $userXp && Achievement::getLevelForXp($userXp->total_xp)['level'] < $levelData['level'],
        ];
    }

    /**
     * Check and award achievements based on requirement type
     */
    public function checkAchievements(User $user): array
    {
        $newlyUnlocked = [];
        $achievements = Achievement::where('is_active', true)->get();

        foreach ($achievements as $achievement) {
            // Check if already unlocked
            $userAch = DB::table('user_achievements')
                ->where('user_id', $user->id)
                ->where('achievement_id', $achievement->id)
                ->first();

            if ($userAch && $userAch->unlocked) {
                continue;
            }

            // Calculate current progress
            $currentProgress = $this->getProgress($user, $achievement->requirement_type);
            $requirement = $achievement->requirement_value;

            // Update progress
            if ($userAch) {
                DB::table('user_achievements')
                    ->where('id', $userAch->id)
                    ->update([
                        'progress' => min($currentProgress, $requirement),
                        'updated_at' => now(),
                    ]);
            } else {
                DB::table('user_achievements')->insert([
                    'user_id' => $user->id,
                    'achievement_id' => $achievement->id,
                    'progress' => min($currentProgress, $requirement),
                    'unlocked' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Check if should unlock
            if ($currentProgress >= $requirement && (!$userAch || !$userAch->unlocked)) {
                $this->unlockAchievement($user, $achievement);
                $newlyUnlocked[] = $achievement;
            }
        }

        return $newlyUnlocked;
    }

    /**
     * Unlock a specific achievement
     */
    public function unlockAchievement(User $user, Achievement $achievement): array
    {
        DB::table('user_achievements')
            ->updateOrInsert(
                ['user_id' => $user->id, 'achievement_id' => $achievement->id],
                [
                    'progress' => $achievement->requirement_value,
                    'unlocked' => true,
                    'unlocked_at' => now(),
                    'updated_at' => now(),
                ]
            );

        // Award XP
        $xpResult = $this->awardXp(
            $user,
            $achievement->xp_reward,
            'achievement:' . $achievement->slug,
            'achievement',
            $achievement->id
        );

        Log::info('Achievement unlocked', [
            'user_id' => $user->id,
            'achievement' => $achievement->slug,
            'xp_gained' => $achievement->xp_reward,
        ]);

        return [
            'achievement' => $achievement,
            'xp_result' => $xpResult,
        ];
    }

    /**
     * Get progress for a specific requirement type
     */
    private function getProgress(User $user, string $requirementType): int
    {
        return match($requirementType) {
            'listings_count' => DB::table('ads')->where('user_id', $user->id)->count(),
            'listings_with_photos' => DB::table('ads')
                ->where('user_id', $user->id)
                ->whereNotNull('images')
                ->where('images', '!=', '[]')
                ->where('images', '!=', 'null')
                ->count(),
            'referrals_count' => DB::table('waitlist_subscribers')
                ->where('referred_by', $user->email)
                ->orWhere('referred_by_code', function($q) use ($user) {
                    $q->select('referral_code')
                      ->from('waitlist_subscribers')
                      ->where('email', $user->email);
                })
                ->count(),
            'streak_days' => $this->getCurrentStreak($user),
            'reviews_count' => 0, // TODO: implement when reviews system exists
            'five_star_reviews' => 0,
            'user_position' => 1, // Default
            default => 0,
        };
    }

    /**
     * Record daily activity and update streak
     */
    public function recordActivity(User $user, string $type = 'login'): array
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        // Record today's activity
        DB::table('activity_streaks')->updateOrInsert(
            ['user_id' => $user->id, 'activity_date' => $today, 'activity_type' => $type],
            ['created_at' => now(), 'updated_at' => now()]
        );

        // Get or create user_xp
        $userXp = DB::table('user_xp')->where('user_id', $user->id)->first();

        if (!$userXp) {
            DB::table('user_xp')->insert([
                'user_id' => $user->id,
                'total_xp' => 0,
                'level' => 1,
                'current_streak' => 1,
                'longest_streak' => 1,
                'last_activity_date' => $today,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return ['streak' => 1, 'is_new_streak' => true];
        }

        // Check if already active today
        if ($userXp->last_activity_date === $today) {
            return ['streak' => $userXp->current_streak, 'is_new_streak' => false];
        }

        // Check if yesterday was active (continue streak)
        $newStreak = ($userXp->last_activity_date === $yesterday)
            ? $userXp->current_streak + 1
            : 1;

        $longestStreak = max($userXp->longest_streak, $newStreak);

        DB::table('user_xp')->where('user_id', $user->id)->update([
            'current_streak' => $newStreak,
            'longest_streak' => $longestStreak,
            'last_activity_date' => $today,
            'updated_at' => now(),
        ]);

        // Award XP for daily login
        if ($userXp->last_activity_date !== $today) {
            $this->awardXp($user, 10, 'daily_login');
        }

        return [
            'streak' => $newStreak,
            'longest_streak' => $longestStreak,
            'is_new_streak' => $newStreak > $userXp->current_streak,
        ];
    }

    /**
     * Get current streak for a user
     */
    public function getCurrentStreak(User $user): int
    {
        $userXp = DB::table('user_xp')->where('user_id', $user->id)->first();
        return $userXp ? $userXp->current_streak : 0;
    }

    /**
     * Get user's gamification profile
     */
    public function getUserProfile(User $user): array
    {
        $userXp = DB::table('user_xp')->where('user_id', $user->id)->first();
        $totalXp = $userXp ? $userXp->total_xp : 0;
        $levelData = Achievement::getLevelForXp($totalXp);

        // Get unlocked achievements
        $unlocked = DB::table('user_achievements')
            ->join('achievements', 'user_achievements.achievement_id', '=', 'achievements.id')
            ->where('user_achievements.user_id', $user->id)
            ->where('user_achievements.unlocked', true)
            ->select('achievements.*', 'user_achievements.unlocked_at', 'user_achievements.progress')
            ->orderBy('user_achievements.unlocked_at', 'desc')
            ->get()
            ->toArray();

        // Get in-progress achievements
        $inProgress = DB::table('user_achievements')
            ->join('achievements', 'user_achievements.achievement_id', '=', 'achievements.id')
            ->where('user_achievements.user_id', $user->id)
            ->where('user_achievements.unlocked', false)
            ->where('user_achievements.progress', '>', 0)
            ->select('achievements.*', 'user_achievements.progress')
            ->get()
            ->toArray();

        // Get all achievements (for progress view)
        $allAchievements = Achievement::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(function($ach) use ($user) {
                $userAch = DB::table('user_achievements')
                    ->where('user_id', $user->id)
                    ->where('achievement_id', $ach->id)
                    ->first();

                return [
                    'id' => $ach->id,
                    'slug' => $ach->slug,
                    'name' => $ach->name,
                    'description' => $ach->description,
                    'icon' => $ach->icon,
                    'category' => $ach->category,
                    'rarity' => $ach->rarity,
                    'xp_reward' => $ach->xp_reward,
                    'requirement_value' => $ach->requirement_value,
                    'progress' => $userAch ? $userAch->progress : 0,
                    'unlocked' => $userAch ? $userAch->unlocked : false,
                    'unlocked_at' => $userAch ? $userAch->unlocked_at : null,
                ];
            });

        // Recent XP transactions
        $recentXp = DB::table('xp_transactions')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return [
            'level' => $levelData,
            'total_xp' => $totalXp,
            'current_streak' => $userXp ? $userXp->current_streak : 0,
            'longest_streak' => $userXp ? $userXp->longest_streak : 0,
            'achievements_unlocked' => count($unlocked),
            'achievements_total' => Achievement::where('is_active', true)->count(),
            'unlocked_achievements' => $unlocked,
            'in_progress' => $inProgress,
            'all_achievements' => $allAchievements,
            'recent_xp' => $recentXp,
        ];
    }
}
