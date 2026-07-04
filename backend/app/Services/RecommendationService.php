<?php

namespace App\Services;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class RecommendationService
{
    /**
     * Get personalized recommendations for a user
     */
    public function getRecommendations(?User $user, int $limit = 12, ?int $excludeAdId = null): array
    {
        if (!$user) {
            return $this->getTrendingRecommendations($limit, $excludeAdId);
        }

        $cacheKey = "recommendations:user:{$user->id}:limit:{$limit}:exclude:{$excludeAdId}";
        
        return Cache::remember($cacheKey, 300, function () use ($user, $limit, $excludeAdId) {
            $recommendations = [];

            // 1. Content-based: similar to user's favorites (40% weight)
            $contentBased = $this->getContentBasedRecommendations($user, $limit, $excludeAdId);
            $recommendations = array_merge($recommendations, $contentBased);

            // 2. Collaborative: users who viewed same ads also viewed (30% weight)
            if (count($recommendations) < $limit) {
                $collaborative = $this->getCollaborativeRecommendations($user, $limit - count($recommendations), $excludeAdId);
                $recommendations = array_merge($recommendations, $collaborative);
            }

            // 3. Fresh: new ads in user's preferred categories (20% weight)
            if (count($recommendations) < $limit) {
                $fresh = $this->getFreshRecommendations($user, $limit - count($recommendations), $excludeAdId);
                $recommendations = array_merge($recommendations, $fresh);
            }

            // 4. Trending: popular in user's region (10% weight)
            if (count($recommendations) < $limit) {
                $trending = $this->getTrendingRecommendations($limit - count($recommendations), $excludeAdId, $user->state);
                $recommendations = array_merge($recommendations, $trending);
            }

            // Remove duplicates and limit
            $uniqueIds = array_unique(array_column($recommendations, 'id'));
            $uniqueAds = array_intersect_key($recommendations, array_flip($uniqueIds));
            
            return array_slice(array_values($uniqueAds), 0, $limit);
        });
    }

    /**
     * Content-based: similar to user's favorites and viewed ads
     */
    private function getContentBasedRecommendations(User $user, int $limit, ?int $excludeAdId): array
    {
        // Get user's favorite ads
        $favoriteIds = DB::table('favorites')
            ->where('user_id', $user->id)
            ->pluck('ad_id')
            ->toArray();

        // Get user's recently viewed ads
        $viewedIds = DB::table('ad_views')
            ->where('user_id', $user->id)
            ->orderBy('viewed_at', 'desc')
            ->limit(20)
            ->pluck('ad_id')
            ->toArray();

        $referenceIds = array_merge($favoriteIds, $viewedIds);
        
        if (empty($referenceIds)) {
            return [];
        }

        // Get categories and states from reference ads
        $referenceAds = Ad::whereIn('id', $referenceIds)
            ->where('status', 'active')
            ->get(['id', 'category', 'state', 'price']);

        if ($referenceAds->isEmpty()) {
            return [];
        }

        $categoryIds = $referenceAds->pluck('category')->unique()->toArray();
        $states = $referenceAds->pluck('state')->unique()->filter()->toArray();
        $avgPrice = $referenceAds->avg('price');

        // Find similar ads
        $query = Ad::where('status', 'active')
            ->whereNotIn('id', array_merge($referenceIds, [$excludeAdId]))
            ->whereNotIn('id', function($query) use ($user) {
                $query->select('ad_id')
                    ->from('favorites')
                    ->where('user_id', $user->id);
            });

        // Filter by category (high priority)
        if (!empty($categoryIds)) {
            $query->whereIn('category', $categoryIds);
        }

        // Filter by state (medium priority)
        if (!empty($states)) {
            $query->whereIn('state', $states);
        }

        // Filter by price range (±30% of average)
        if ($avgPrice && $avgPrice > 0) {
            $minPrice = $avgPrice * 0.7;
            $maxPrice = $avgPrice * 1.3;
            $query->whereBetween('price', [$minPrice, $maxPrice]);
        }

        $ads = $query->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return $this->formatAds($ads, 'content_based');
    }

    /**
     * Collaborative filtering: users who viewed same ads also viewed
     */
    private function getCollaborativeRecommendations(User $user, int $limit, ?int $excludeAdId): array
    {
        // Get ads viewed by current user
        $userViewedIds = DB::table('ad_views')
            ->where('user_id', $user->id)
            ->pluck('ad_id')
            ->toArray();

        if (empty($userViewedIds)) {
            return [];
        }

        // Find other users who viewed the same ads
        $similarUsers = DB::table('ad_views')
            ->whereIn('ad_id', $userViewedIds)
            ->where('user_id', '!=', $user->id)
            ->distinct()
            ->pluck('user_id')
            ->toArray();

        if (empty($similarUsers)) {
            return [];
        }

        // Get ads viewed by similar users (that current user hasn't viewed)
        $recommendedIds = DB::table('ad_views')
            ->whereIn('user_id', $similarUsers)
            ->whereNotIn('ad_id', $userViewedIds)
            ->whereNotIn('ad_id', [$excludeAdId])
            ->select('ad_id', DB::raw('COUNT(*) as view_count'))
            ->groupBy('ad_id')
            ->orderBy('view_count', 'desc')
            ->limit($limit)
            ->pluck('ad_id')
            ->toArray();

        if (empty($recommendedIds)) {
            return [];
        }

        $ads = Ad::whereIn('id', $recommendedIds)
            ->where('status', 'active')
            ->get();

        return $this->formatAds($ads, 'collaborative');
    }

    /**
     * Fresh: new ads in user's preferred categories
     */
    private function getFreshRecommendations(User $user, int $limit, ?int $excludeAdId): array
    {
        // Get user's preferred categories (from favorites and views)
        $preferredCategories = DB::table('favorites')
            ->join('ads', 'favorites.ad_id', '=', 'ads.id')
            ->where('favorites.user_id', $user->id)
            ->pluck('ads.category')
            ->unique()
            ->toArray();

        if (empty($preferredCategories)) {
            return [];
        }

        $ads = Ad::whereIn('category', $preferredCategories)
            ->where('status', 'active')
            ->where('id', '!=', $excludeAdId)
            ->whereNotIn('id', function($query) use ($user) {
                $query->select('ad_id')
                    ->from('favorites')
                    ->where('user_id', $user->id);
            })
            ->where('created_at', '>=', now()->subDays(7))
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return $this->formatAds($ads, 'fresh');
    }

    /**
     * Trending: popular ads (globally or in region)
     */
    public function getTrendingRecommendations(int $limit, ?int $excludeAdId = null, ?string $state = null): array
    {
        $cacheKey = "recommendations:trending:limit:{$limit}:state:{$state}:exclude:{$excludeAdId}";
        
        return Cache::remember($cacheKey, 600, function () use ($limit, $excludeAdId, $state) {
            $query = Ad::where('status', 'active')
                ->where('id', '!=', $excludeAdId)
                ->where('created_at', '>=', now()->subDays(30));

            if ($state) {
                $query->where('state', $state);
            }

            $ads = $query->orderBy('views', 'desc')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            return $this->formatAds($ads, 'trending');
        });
    }

    /**
     * Track ad view for collaborative filtering
     */
    public function trackView(int $adId, ?User $user, ?string $ipAddress = null, ?string $userAgent = null): void
    {
        if (!$user) {
            return; // Only track authenticated users
        }

        // Prevent duplicate views within 1 hour
        $recentView = DB::table('ad_views')
            ->where('ad_id', $adId)
            ->where('user_id', $user->id)
            ->where('viewed_at', '>=', now()->subHour())
            ->exists();

        if ($recentView) {
            return;
        }

        DB::table('ad_views')->insert([
            'ad_id' => $adId,
            'user_id' => $user->id,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'viewed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Clear recommendation cache
        Cache::forget("recommendations:user:{$user->id}");
    }

    /**
     * Format ads for API response
     */
    private function formatAds($ads, string $reason): array
    {
        return $ads->map(function ($ad) use ($reason) {
            return [
                'id' => $ad->id,
                'title' => $ad->title,
                'price' => $ad->price,
                'currency' => $ad->currency ?? 'MXN',
                'state' => $ad->state,
                'city' => $ad->city,
                'category' => $ad->category,
                'images' => $ad->images ?? [],
                'views' => $ad->views ?? 0,
                'created_at' => $ad->created_at,
                'recommendation_reason' => $reason,
                'reason_label' => $this->getReasonLabel($reason),
            ];
        })->toArray();
    }

    /**
     * Get human-readable reason label
     */
    private function getReasonLabel(string $reason): string
    {
        $labels = [
            'content_based' => 'Similar a tus favoritos',
            'collaborative' => 'Usuarios también vieron',
            'fresh' => 'Nuevo en tu zona',
            'trending' => 'Trending',
        ];

        return $labels[$reason] ?? 'Recomendado';
    }
}
