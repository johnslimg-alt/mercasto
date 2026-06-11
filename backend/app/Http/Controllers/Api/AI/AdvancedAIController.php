<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\SemanticSearchService;
use App\Services\AI\FraudDetectionService;
use App\Services\AI\DemandForecastingService;
use App\Services\AI\CollaborativeFilteringService;
use App\Models\Ad;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Advanced AI Features Controller
 * - Semantic Search (vector embeddings)
 * - Fraud Detection (ML scoring)
 * - Demand Forecasting (time-series)
 * - Collaborative Filtering (recommendations)
 */
class AdvancedAIController extends Controller
{
    public function __construct(
        private SemanticSearchService $semanticSearch,
        private FraudDetectionService $fraudDetection,
        private DemandForecastingService $demandForecasting,
        private CollaborativeFilteringService $collaborativeFiltering
    ) {}

    // ========== SEMANTIC SEARCH ==========

    /**
     * Semantic search - understands meaning, not just keywords
     * GET /api/ai/search/semantic?q=auto+barato&category=autos
     */
    public function semanticSearch(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2|max:200',
            'limit' => 'integer|min:1|max:50',
            'category' => 'string|nullable',
            'state' => 'string|nullable',
            'min_price' => 'numeric|nullable',
            'max_price' => 'numeric|nullable',
        ]);

        try {
            $results = $this->semanticSearch->search(
                query: $request->input('q'),
                limit: $request->input('limit', 20),
                category: $request->input('category'),
                state: $request->input('state'),
                minPrice: $request->input('min_price'),
                maxPrice: $request->input('max_price'),
            );

            return response()->json([
                'success' => true,
                'search_type' => 'semantic',
                'query' => $request->input('q'),
                'total' => $results['total'] ?? 0,
                'results' => $results['results'] ?? [],
                'fallback' => $results['fallback'] ?? false,
            ]);
        } catch (\Exception $e) {
            Log::error('Semantic search error', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'error' => 'Search failed',
                'fallback' => true,
            ], 500);
        }
    }

    /**
     * Find similar ads using vector similarity
     * GET /api/ai/search/similar/{ad_id}
     */
    public function findSimilar(Request $request, int $adId)
    {
        $ad = Ad::find($adId);
        if (!$ad) {
            return response()->json(['success' => false, 'error' => 'Ad not found'], 404);
        }

        $similar = $this->semanticSearch->findSimilar($ad, $request->input('limit', 10));

        return response()->json([
            'success' => true,
            'source_ad_id' => $adId,
            'total' => count($similar),
            'results' => $similar,
        ]);
    }

    /**
     * Generate embedding for an ad (admin)
     * POST /api/ai/embeddings/generate/{ad_id}
     */
    public function generateEmbedding(int $adId)
    {
        $ad = Ad::find($adId);
        if (!$ad) {
            return response()->json(['success' => false, 'error' => 'Ad not found'], 404);
        }

        $success = $this->semanticSearch->generateEmbedding($ad);

        return response()->json([
            'success' => $success,
            'ad_id' => $adId,
            'message' => $success ? 'Embedding generated' : 'Failed to generate embedding',
        ]);
    }

    /**
     * Backfill embeddings for all ads (admin, cron job)
     * POST /api/ai/embeddings/backfill
     */
    public function backfillEmbeddings(Request $request)
    {
        $result = $this->semanticSearch->backfillEmbeddings(
            $request->input('batch_size', 50)
        );

        return response()->json([
            'success' => true,
            'processed' => $result['processed'],
            'failed' => $result['failed'],
            'remaining' => $result['remaining'],
        ]);
    }

    /**
     * Get embedding status
     * GET /api/ai/embeddings/status
     */
    public function embeddingStatus()
    {
        $total = Ad::where('status', 'active')->count();
        $withEmbedding = \DB::table('ads')->whereNotNull('embedding')->count();
        
        return response()->json([
            'success' => true,
            'total_ads' => $total,
            'with_embedding' => $withEmbedding,
            'without_embedding' => $total - $withEmbedding,
            'coverage_percent' => $total > 0 ? round(($withEmbedding / $total) * 100, 1) : 0,
        ]);
    }

    // ========== FRAUD DETECTION ==========

    /**
     * Analyze ad for fraud
     * POST /api/ai/fraud/analyze/{ad_id}
     */
    public function analyzeFraud(int $adId)
    {
        $ad = Ad::find($adId);
        if (!$ad) {
            return response()->json(['success' => false, 'error' => 'Ad not found'], 404);
        }

        $result = $this->fraudDetection->analyze($ad);

        return response()->json([
            'success' => true,
            'analysis' => $result,
        ]);
    }

    /**
     * Batch analyze recent ads (admin)
     * POST /api/ai/fraud/batch
     */
    public function batchFraudAnalysis(Request $request)
    {
        $result = $this->fraudDetection->batchAnalyze(
            $request->input('limit', 100)
        );

        return response()->json([
            'success' => true,
            'analyzed' => $result['analyzed'],
            'flagged' => $result['flagged'],
            'clean' => $result['clean'],
            'flag_rate_percent' => $result['analyzed'] > 0 
                ? round(($result['flagged'] / $result['analyzed']) * 100, 1) 
                : 0,
        ]);
    }

    /**
     * Get flagged ads for review (admin)
     * GET /api/ai/fraud/flagged
     */
    public function getFlaggedAds(Request $request)
    {
        $flagged = Ad::where('fraud_score', '>=', 40)
            ->where('status', 'under_review')
            ->orderByDesc('fraud_score')
            ->limit($request->input('limit', 50))
            ->get(['id', 'title', 'price', 'fraud_score', 'fraud_flags', 'last_fraud_check_at', 'user_id', 'created_at']);

        return response()->json([
            'success' => true,
            'total' => $flagged->count(),
            'flagged_ads' => $flagged,
        ]);
    }

    // ========== DEMAND FORECASTING ==========

    /**
     * Get demand forecast for a category
     * GET /api/ai/forecast/category/{slug}?days=30
     */
    public function categoryForecast(Request $request, string $categorySlug)
    {
        $forecast = $this->demandForecasting->forecastCategory(
            $categorySlug,
            $request->input('days', 30)
        );

        return response()->json([
            'success' => true,
            'forecast' => $forecast,
        ]);
    }

    /**
     * Get trending categories
     * GET /api/ai/forecast/trending
     */
    public function trendingCategories(Request $request)
    {
        $trends = $this->demandForecasting->getTrendingCategories(
            $request->input('days', 14)
        );

        return response()->json([
            'success' => true,
            'trending' => $trends,
        ]);
    }

    /**
     * Get best posting time prediction
     * GET /api/ai/forecast/best-time?category=autos
     */
    public function bestPostingTime(Request $request)
    {
        $result = $this->demandForecasting->predictBestPostingTime(
            $request->input('category')
        );

        return response()->json([
            'success' => true,
            'prediction' => $result,
        ]);
    }

    /**
     * Get price trend prediction
     * GET /api/ai/forecast/price/{category}
     */
    public function priceTrend(Request $request, string $categorySlug)
    {
        $result = $this->demandForecasting->predictPriceTrend(
            $categorySlug,
            $request->input('days', 30)
        );

        return response()->json([
            'success' => true,
            'price_trend' => $result,
        ]);
    }

    /**
     * Get platform demand summary
     * GET /api/ai/forecast/summary
     */
    public function demandSummary()
    {
        $summary = $this->demandForecasting->getPlatformDemandSummary();

        return response()->json([
            'success' => true,
            'summary' => $summary,
        ]);
    }

    // ========== COLLABORATIVE FILTERING ==========

    /**
     * Get personalized recommendations (CF)
     * GET /api/ai/recommendations/personalized
     */
    public function personalizedRecommendations(Request $request)
    {
        if (!$request->user()) {
            return response()->json([
                'success' => false,
                'error' => 'Authentication required',
            ], 401);
        }

        $recommendations = $this->collaborativeFiltering->getRecommendations(
            $request->user(),
            $request->input('limit', 20)
        );

        return response()->json([
            'success' => true,
            'user_id' => $request->user()->id,
            'total' => count($recommendations),
            'recommendations' => $recommendations,
            'algorithm' => 'hybrid_cf (item-based 60% + user-based 40%)',
        ]);
    }
}
