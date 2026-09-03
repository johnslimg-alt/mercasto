<?php

namespace App\Http\Controllers\Api;

use App\Services\HybridRecommendationService;
use App\Services\RecommendationService;
use Illuminate\Http\Request;

class HybridRecommendationController extends RecommendationController
{
    public function __construct(
        RecommendationService $recommendationService,
        private HybridRecommendationService $hybridRecommendations,
    ) {
        parent::__construct($recommendationService);
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'exclude_ad_id' => 'nullable|integer|exists:ads,id',
        ]);

        $recommendations = $this->hybridRecommendations->getRecommendations(
            $request->user(),
            (int) ($validated['limit'] ?? 12),
            isset($validated['exclude_ad_id']) ? (int) $validated['exclude_ad_id'] : null,
        );

        return response()->json([
            'success' => true,
            'data' => $recommendations,
            'meta' => [
                'total' => count($recommendations),
                'personalized' => $request->user() !== null,
                'strategy' => 'hybrid_exact_first',
                'algorithms' => array_values(array_unique(array_column($recommendations, 'recommendation_reason'))),
            ],
        ]);
    }
}
