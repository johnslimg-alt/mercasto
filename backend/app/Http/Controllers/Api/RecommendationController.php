<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RecommendationService;
use Illuminate\Http\Request;

class RecommendationController extends Controller
{
    protected $recommendationService;

    public function __construct(RecommendationService $recommendationService)
    {
        $this->recommendationService = $recommendationService;
    }

    /**
     * Get personalized recommendations
     * 
     * GET /api/recommendations?limit=12&exclude_ad_id=123
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'exclude_ad_id' => 'nullable|integer|exists:ads,id',
        ]);

        $user = $request->user();
        $limit = $validated['limit'] ?? 12;
        $excludeAdId = $validated['exclude_ad_id'] ?? null;

        $recommendations = $this->recommendationService->getRecommendations(
            $user,
            $limit,
            $excludeAdId
        );

        return response()->json([
            'success' => true,
            'data' => $recommendations,
            'meta' => [
                'total' => count($recommendations),
                'personalized' => $user !== null,
                'algorithms' => array_unique(array_column($recommendations, 'recommendation_reason')),
            ],
        ]);
    }

    /**
     * Get trending recommendations (public)
     * 
     * GET /api/recommendations/trending?limit=12&state=CDMX
     */
    public function trending(Request $request)
    {
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'state' => 'nullable|string|max:100',
            'exclude_ad_id' => 'nullable|integer|exists:ads,id',
        ]);

        $limit = $validated['limit'] ?? 12;
        $state = $validated['state'] ?? null;
        $excludeAdId = $validated['exclude_ad_id'] ?? null;

        $recommendations = $this->recommendationService->getTrendingRecommendations(
            $limit,
            $excludeAdId,
            $state
        );

        return response()->json([
            'success' => true,
            'data' => $recommendations,
            'meta' => [
                'total' => count($recommendations),
                'state' => $state,
            ],
        ]);
    }

    /**
     * Track ad view for collaborative filtering
     * 
     * POST /api/ads/{ad}/view
     */
    public function trackView(Request $request, $adId)
    {
        $user = $request->user();
        
        $this->recommendationService->trackView(
            $adId,
            $user,
            $request->ip(),
            $request->userAgent()
        );

        return response()->json([
            'success' => true,
            'message' => 'View tracked',
        ]);
    }
}
