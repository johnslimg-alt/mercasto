<?php

namespace App\Http\Controllers\Api;

use App\Services\AI\OllamaClient;
use App\Support\SqlLikePattern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class HybridSearchController extends SearchController
{
    public function __construct(private OllamaClient $ollama)
    {
    }

    public function semanticSearch(Request $request)
    {
        if (! (bool) config('semantic_retrieval.hybrid_search_enabled', true)) {
            return parent::semanticSearch($request);
        }

        $validated = $request->validate([
            'search' => 'nullable|string|max:100',
            'q' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'condition' => 'nullable',
        ]);
        $q = trim((string) ($validated['search'] ?? $validated['q'] ?? ''));
        if (mb_strlen($q) < 2 || DB::connection()->getDriverName() !== 'pgsql') {
            return parent::semanticSearch($request);
        }

        $startedAt = microtime(true);
        try {
            $embedding = $this->ollama->embed($q);
            if (! is_array($embedding) || $embedding === []) {
                return parent::semanticSearch($request);
            }

            $vector = '['.implode(',', $embedding).']';
            $term = SqlLikePattern::contains(mb_strtolower($q, 'UTF-8'));
            $titleLike = SqlLikePattern::clause('LOWER(ads.title) LIKE ?');
            $descriptionLike = SqlLikePattern::clause('LOWER(ads.description) LIKE ?');
            $threshold = (float) config('semantic_retrieval.minimum_similarity', 0.30);
            $maximumDistance = max(0.0, min(1.0, 1.0 - $threshold));

            $query = \App\Models\Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
                ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
                ->selectRaw('ads.*, (embeddings.embedding <=> ?::vector) AS vec_distance', [$vector])
                ->where('ads.status', 'active')
                ->where('ads.is_catalog_filler', false)
                ->where(function ($scope) use ($titleLike, $descriptionLike, $term, $vector, $maximumDistance) {
                    $scope->whereRaw($titleLike, [$term])
                        ->orWhereRaw($descriptionLike, [$term])
                        ->orWhereRaw('(embeddings.embedding <=> ?::vector) <= ?', [$vector, $maximumDistance]);
                });

            $this->applyHybridFilters($query, $validated);
            $query->orderByRaw("CASE WHEN {$titleLike} THEN 0 WHEN {$descriptionLike} THEN 1 ELSE 2 END", [$term, $term])
                ->orderBy('vec_distance')
                ->orderByDesc('ads.created_at');

            $results = $query->paginate(16);
            if ($results->total() === 0) {
                return parent::semanticSearch($request);
            }

            $payload = $results->toArray();
            $payload['meta'] = [
                'strategy' => 'hybrid_exact_first',
                'semantic_coverage' => true,
                'embedding_runtime' => 'private_local',
                'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ];

            return response()->json($payload);
        } catch (Throwable) {
            return parent::semanticSearch($request);
        }
    }

    private function applyHybridFilters($query, array $validated): void
    {
        if (! empty($validated['category'])) {
            $query->where('ads.category', $validated['category']);
        }
        if (! empty($validated['state'])) {
            $query->whereRaw(
                SqlLikePattern::clause('ads.state ILIKE ?'),
                [SqlLikePattern::escape(trim((string) $validated['state']))],
            );
        }
        if (isset($validated['min_price'])) {
            $query->where('ads.price', '>=', $validated['min_price']);
        }
        if (isset($validated['max_price'])) {
            $query->where('ads.price', '<=', $validated['max_price']);
        }
        if (! empty($validated['condition'])) {
            $conditions = is_array($validated['condition'])
                ? $validated['condition']
                : explode(',', (string) $validated['condition']);
            $conditions = array_values(array_filter(array_map('trim', $conditions)));
            if ($conditions !== []) {
                $query->whereIn('ads.condition', $conditions);
            }
        }
    }
}
