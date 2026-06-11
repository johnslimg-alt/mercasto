<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GamificationService;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    private GamificationService $gamification;

    public function __construct(GamificationService $gamification)
    {
        $this->gamification = $gamification;
    }

    /**
     * Get user's gamification profile (XP, level, achievements)
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        $profile = $this->gamification->getUserProfile($user);

        return response()->json([
            'success' => true,
            'data' => $profile,
        ]);
    }

    /**
     * Record activity (login, post, etc.)
     */
    public function recordActivity(Request $request)
    {
        $user = $request->user();
        $type = $request->input('type', 'login');

        $result = $this->gamification->recordActivity($user, $type);

        // Also check achievements
        $newAchievements = $this->gamification->checkAchievements($user);

        return response()->json([
            'success' => true,
            'streak' => $result,
            'new_achievements' => $newAchievements,
        ]);
    }

    /**
     * Get all available achievements
     */
    public function achievements()
    {
        $achievements = \App\Models\Achievement::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'success' => true,
            'achievements' => $achievements,
        ]);
    }

    /**
     * Get leaderboard by XP
     */
    public function leaderboard(Request $request)
    {
        $topUsers = \Illuminate\Support\Facades\DB::table('user_xp')
            ->join('users', 'user_xp.user_id', '=', 'users.id')
            ->select(
                'users.id',
                'users.name',
                'user_xp.total_xp',
                'user_xp.level',
                'user_xp.current_streak',
                'user_xp.longest_streak'
            )
            ->orderBy('user_xp.total_xp', 'desc')
            ->limit(20)
            ->get()
            ->map(function($user, $index) {
                $levelData = \App\Models\Achievement::getLevelForXp($user->total_xp);
                return [
                    'rank' => $index + 1,
                    'name' => $user->name ?: ('User #' . $user->id),
                    'initials' => $this->getInitials($user->name ?: 'User'),
                    'total_xp' => $user->total_xp,
                    'level' => $user->level,
                    'level_name' => $levelData['name'],
                    'level_icon' => $levelData['icon'],
                    'streak' => $user->current_streak,
                ];
            });

        return response()->json([
            'success' => true,
            'leaderboard' => $topUsers,
        ]);
    }

    private function getInitials(string $name): string
    {
        $words = explode(' ', trim($name));
        $initials = '';
        foreach ($words as $word) {
            if (strlen($word) > 0) {
                $initials .= strtoupper($word[0]);
            }
            if (strlen($initials) >= 2) break;
        }
        return $initials ?: 'U';
    }
}
