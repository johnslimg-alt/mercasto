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
        return DB::transaction(function () use ($user, $amount, $reason, $refType, $refId): array {
            $now = now();

            DB::table('user_xp')->insertOrIgnore([
                'user_id' => $user->id,
                'total_xp' => 0,
                'level' => 1,
                'current_streak' => 0,
                'longest_streak' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $userXp = DB::table('user_xp')
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $userXp) {
                throw new \RuntimeException('Unable to initialize gamification XP state.');
            }

            $previousTotal = (int) $userXp->total_xp;
            $newTotal = $previousTotal + $amount;
            $previousLevel = Achievement::getLevelForXp($previousTotal);
            $levelData = Achievement::getLevelForXp($newTotal);

            DB::table('user_xp')->where('user_id', $user->id)->update([
                'total_xp' => $newTotal,
                'level' => $levelData['level'],
                'last_xp_gain_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('xp_transactions')->insert([
                'user_id' => $user->id,
                'amount' => $amount,
                'reason' => $reason,
                'reference_type' => $refType,
                'reference_id' => $refId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'xp_gained' => $amount,
                'total_xp' => $newTotal,
                'level' => $levelData['level'],
                'level_name' => $levelData['name'],
                'level_up' => $previousLevel['level'] < $levelData['level'],
            ];
        });
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

            // Calculate current progress. Most achievements grow toward a threshold,
            // while user_position is a rank where a lower number is better.
            $currentProgress = $this->getProgress($user, $achievement->requirement_type);
            $requirement = (int) $achievement->requirement_value;
            $requirementMet = $this->meetsRequirement(
                $achievement->requirement_type,
                $currentProgress,
                $requirement
            );
            $storedProgress = $this->progressForStorage(
                $achievement->requirement_type,
                $currentProgress,
                $requirement,
                $requirementMet
            );

            // Ensure the progress row exists without racing another sync, then only
            // update progress while the achievement is still locked.
            $now = now();
            DB::table('user_achievements')->insertOrIgnore([
                'user_id' => $user->id,
                'achievement_id' => $achievement->id,
                'progress' => $storedProgress,
                'unlocked' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('user_achievements')
                ->where('user_id', $user->id)
                ->where('achievement_id', $achievement->id)
                ->where('unlocked', false)
                ->update([
                    'progress' => $storedProgress,
                    'updated_at' => $now,
                ]);

            // Only the request that atomically flips locked -> unlocked may award XP.
            if ($requirementMet) {
                $unlockResult = $this->unlockAchievement($user, $achievement);
                if ($unlockResult['unlocked_now']) {
                    $newlyUnlocked[] = $achievement;
                }
            }
        }

        return $newlyUnlocked;
    }

    /**
     * Unlock a specific achievement
     */
    public function unlockAchievement(User $user, Achievement $achievement): array
    {
        return DB::transaction(function () use ($user, $achievement): array {
            $now = now();

            // Keep the method safe even if called directly before a progress row exists.
            DB::table('user_achievements')->insertOrIgnore([
                'user_id' => $user->id,
                'achievement_id' => $achievement->id,
                'progress' => 0,
                'unlocked' => false,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $claimed = DB::table('user_achievements')
                ->where('user_id', $user->id)
                ->where('achievement_id', $achievement->id)
                ->where('unlocked', false)
                ->update([
                    'progress' => (int) $achievement->requirement_value,
                    'unlocked' => true,
                    'unlocked_at' => $now,
                    'updated_at' => $now,
                ]);

            if ($claimed !== 1) {
                return [
                    'achievement' => $achievement,
                    'xp_result' => null,
                    'unlocked_now' => false,
                ];
            }

            $xpResult = $this->awardXp(
                $user,
                (int) $achievement->xp_reward,
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
                'unlocked_now' => true,
            ];
        });
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
                ->whereNotNull('image_url')
                ->where('image_url', '!=', '')
                ->where('image_url', '!=', '[]')
                ->where('image_url', '!=', 'null')
                ->where('generated_cover', false)
                ->count(),
            'referrals_count' => DB::table('referrals')
                ->where('referrer_id', $user->id)
                ->count(),
            'streak_days' => $this->getCurrentStreak($user),
            'reviews_count' => DB::table('reviews')
                ->where('seller_id', $user->id)
                ->count(),
            'five_star_reviews' => DB::table('reviews')
                ->where('seller_id', $user->id)
                ->where('rating', 5)
                ->count(),
            // User IDs are monotonic registration sequence identifiers. Using the
            // immutable ID preserves the original milestone even if older accounts
            // are later deleted; a live rank would incorrectly promote newer users.
            'user_position' => (int) $user->id,
            default => 0,
        };
    }

    private function meetsRequirement(string $requirementType, int $currentProgress, int $requirement): bool
    {
        if ($requirementType === 'user_position') {
            return $currentProgress > 0 && $currentProgress <= $requirement;
        }

        return $currentProgress >= $requirement;
    }

    private function progressForStorage(
        string $requirementType,
        int $currentProgress,
        int $requirement,
        bool $requirementMet
    ): int {
        // Position milestones are binary membership achievements, not a progress
        // bar. Avoid showing a locked late user as 100/100 complete.
        if ($requirementType === 'user_position') {
            return $requirementMet ? $requirement : 0;
        }

        return min($currentProgress, $requirement);
    }

    /**
     * Record daily activity and update streak
     */
    public function recordActivity(User $user, string $type = 'login'): array
    {
        return DB::transaction(function () use ($user, $type): array {
            $now = now();
            $today = $now->toDateString();
            $yesterday = $now->copy()->subDay()->toDateString();

            // Serialize activity initialization per user. This avoids relying on
            // driver-specific insertOrIgnore row counts and closes first-login races.
            $lockedUserId = DB::table('users')
                ->where('id', $user->id)
                ->lockForUpdate()
                ->value('id');

            if (! $lockedUserId) {
                throw new \RuntimeException('Unable to lock gamification user state.');
            }

            DB::table('activity_streaks')->insertOrIgnore([
                'user_id' => $user->id,
                'activity_date' => $today,
                'activity_type' => $type,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $userXp = DB::table('user_xp')
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $userXp) {
                DB::table('user_xp')->insert([
                    'user_id' => $user->id,
                    'total_xp' => 0,
                    'level' => 1,
                    'current_streak' => 1,
                    'longest_streak' => 1,
                    'last_activity_date' => $today,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                return ['streak' => 1, 'is_new_streak' => true];
            }

            if ($userXp->last_activity_date === $today) {
                return ['streak' => (int) $userXp->current_streak, 'is_new_streak' => false];
            }

            $currentStreak = (int) $userXp->current_streak;
            $newStreak = ($userXp->last_activity_date === $yesterday)
                ? $currentStreak + 1
                : 1;
            $longestStreak = max((int) $userXp->longest_streak, $newStreak);

            DB::table('user_xp')->where('user_id', $user->id)->update([
                'current_streak' => $newStreak,
                'longest_streak' => $longestStreak,
                'last_activity_date' => $today,
                'updated_at' => $now,
            ]);

            // The user_xp row is locked for this transaction, so concurrent logins
            // cannot both award the same daily-login XP.
            $this->awardXp($user, 10, 'daily_login');

            return [
                'streak' => $newStreak,
                'longest_streak' => $longestStreak,
                'is_new_streak' => $newStreak > $currentStreak,
            ];
        });
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
