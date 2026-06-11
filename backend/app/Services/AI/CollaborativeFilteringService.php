<?php

namespace App\Services\AI;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Advanced Collaborative Filtering
 * Uses item-item and user-user similarity matrices
 * "Users who viewed X also viewed Y"
 */
class CollaborativeFilteringService
{
    /**
     * Get recommendations based on collaborative filtering
     * Combines user-based and item-based CF
     */
    public function getRecommendations(User $user, int $limit = 20): array
    {
        // Get user's interaction history
        $viewedAdIds = $this->getUserViewedAds($user->id);
        $favoritedAdIds = $this->getUserFavoritedAds($user->id);
        $interactedAdIds = array_unique(array_merge($viewedAdIds, $favoritedAdIds));

        if (empty($interactedAdIds)) {
            // Cold start: return trending
            return $this->getTrendingRecommendations($limit);
        }

        // Item-based CF: "Users who viewed this also viewed..."
        $itemBased = $this->itemBasedCF($interactedAdIds, $limit);
        
        // User-based CF: "Users similar to you liked..."
        $userBased = $this->userBasedCF($user->id, $interactedAdIds, $limit);

        // Combine with weighted scoring
        $combined = $this->combineScores($itemBased, $userBased);
        
        // Remove already interacted
        $combined = array_filter($combined, fn($ad) => !in_array($ad['id'], $interactedAdIds));

        // Fetch full ad data
        $adIds = array_slice(array_column($combined, 'id'), 0, $limit);
        $ads = Ad::with(['user'])
            ->whereIn('id', $adIds)
            ->where('status', 'active')
            ->get()
            ->keyBy('id');

        return array_map(function ($item) use ($ads) {
            $ad = $ads->get($item['id']);
            if ($ad) {
                $ad->cf_score = $item['score'];
                $ad->cf_reason = $item['reason'];
            }
            return $ad;
        }, array_filter($combined, fn($item) => $ads->has($item['id'])));
    }

    /**
     * Item-based collaborative filtering
     * Finds ads similar to what the user already interacted with
     */
    private function itemBasedCF(array $adIds, int $limit): array
    {
        $cacheKey = 'item_cf_' . md5(implode(',', $adIds));
        
        return Cache::remember($cacheKey, 600, function () use ($adIds, $limit) {
            // Find ads frequently viewed together with user's history
            $similarAds = DB::table('ad_views as v1')
                ->join('ad_views as v2', function ($join) {
                    $join->on('v1.user_id', '=', 'v2.user_id')
                         ->whereColumn('v1.ad_id', '!=', 'v2.ad_id');
                })
                ->whereIn('v1.ad_id', $adIds)
                ->whereNotIn('v2.ad_id', $adIds)
                ->selectRaw('v2.ad_id, COUNT(DISTINCT v1.user_id) as co_views')
                ->groupBy('v2.ad_id')
                ->orderByDesc('co_views')
                ->limit($limit * 2)
                ->get();

            // Normalize scores
            $maxCoViews = $similarAds->max('co_views') ?? 1;

            return $similarAds->map(fn($row) => [
                'id' => $row->ad_id,
                'score' => round(($row->co_views / $maxCoViews) * 100, 1),
                'reason' => 'Usuarios que vieron esto también vieron',
                'type' => 'item_cf',
            ])->toArray();
        });
    }

    /**
     * User-based collaborative filtering
     * Find similar users and recommend what they liked
     */
    private function userBasedCF(int $userId, array $myAdIds, int $limit): array
    {
        $cacheKey = "user_cf_{$userId}";
        
        return Cache::remember($cacheKey, 600, function () use ($userId, $myAdIds, $limit) {
            // Find users who viewed the same ads as current user
            $similarUsers = DB::table('ad_views as my_views')
                ->join('ad_views as other_views', function ($join) use ($userId) {
                    $join->on('my_views.ad_id', '=', 'other_views.ad_id')
                         ->whereColumn('my_views.user_id', '!=', 'other_views.user_id');
                })
                ->where('my_views.user_id', $userId)
                ->selectRaw('other_views.user_id, COUNT(DISTINCT my_views.ad_id) as shared_views')
                ->groupBy('other_views.user_id')
                ->having('shared_views', '>=', 2) // At least 2 ads in common
                ->orderByDesc('shared_views')
                ->limit(50)
                ->get();

            if ($similarUsers->isEmpty()) {
                return [];
            }

            $similarUserIds = $similarUsers->pluck('user_id')->toArray();
            $userSimilarity = $similarUsers->pluck('shared_views', 'user_id')->toArray();
            
            $maxShared = $similarUsers->max('shared_views') ?? 1;

            // Get ads viewed by similar users (that current user hasn't seen)
            $recommendedAds = DB::table('ad_views')
                ->whereIn('user_id', $similarUserIds)
                ->whereNotIn('ad_id', $myAdIds)
                ->selectRaw('ad_id, user_id')
                ->get()
                ->groupBy('ad_id');

            $results = [];
            foreach ($recommendedAds as $adId => $views) {
                $weightedScore = 0;
                foreach ($views as $view) {
                    $similarity = ($userSimilarity[$view->user_id] ?? 0) / $maxShared;
                    $weightedScore += $similarity;
                }

                $results[] = [
                    'id' => $adId,
                    'score' => round($weightedScore * 50, 1), // Scale to match item CF
                    'reason' => 'Usuarios similares a ti también vieron',
                    'type' => 'user_cf',
                ];
            }

            // Sort by score
            usort($results, fn($a, $b) => $b['score'] <=> $a['score']);

            return array_slice($results, 0, $limit);
        });
    }

    /**
     * Combine item-based and user-based scores
     */
    private function combineScores(array $itemBased, array $userBased): array
    {
        $combined = [];

        // Item-based gets 60% weight
        foreach ($itemBased as $item) {
            $id = $item['id'];
            $combined[$id] = [
                'id' => $id,
                'score' => $item['score'] * 0.6,
                'reason' => $item['reason'],
                'type' => $item['type'],
            ];
        }

        // User-based gets 40% weight
        foreach ($userBased as $item) {
            $id = $item['id'];
            if (isset($combined[$id])) {
                $combined[$id]['score'] += $item['score'] * 0.4;
                $combined[$id]['reason'] = 'Recomendado para ti';
                $combined[$id]['type'] = 'hybrid';
            } else {
                $combined[$id] = [
                    'id' => $id,
                    'score' => $item['score'] * 0.4,
                    'reason' => $item['reason'],
                    'type' => $item['type'],
                ];
            }
        }

        // Sort by combined score
        usort($combined, fn($a, $b) => $b['score'] <=> $a['score']);

        return $combined;
    }

    /**
     * Cold start: trending recommendations
     */
    private function getTrendingRecommendations(int $limit): array
    {
        $trending = DB::table('ad_views')
            ->join('ads', 'ad_views.ad_id', '=', 'ads.id')
            ->where('ads.status', 'active')
            ->where('ad_views.created_at', '>', now()->subDays(7))
            ->selectRaw('ads.id, COUNT(*) as views')
            ->groupBy('ads.id')
            ->orderByDesc('views')
            ->limit($limit)
            ->get();

        $ads = Ad::with(['user'])
            ->whereIn('id', $trending->pluck('id'))
            ->get()
            ->keyBy('id');

        return $trending->map(function ($row) use ($ads) {
            $ad = $ads->get($row->id);
            if ($ad) {
                $ad->cf_score = 50;
                $ad->cf_reason = 'Trending esta semana';
                $ad->trending_views = $row->views;
            }
            return $ad;
        })->filter()->values()->toArray();
    }

    private function getUserViewedAds(int $userId): array
    {
        return DB::table('ad_views')
            ->where('user_id', $userId)
            ->distinct()
            ->pluck('ad_id')
            ->toArray();
    }

    private function getUserFavoritedAds(int $userId): array
    {
        return DB::table('favorites')
            ->where('user_id', $userId)
            ->pluck('ad_id')
            ->toArray();
    }
}
