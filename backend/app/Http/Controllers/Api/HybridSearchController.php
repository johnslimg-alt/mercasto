<?php

namespace App\Http\Controllers\Api;

use App\Models\Ad;
use App\Services\AI\DiscoveryRanker;
use App\Services\AI\SemanticSearchService;
use App\Support\SqlLikePattern;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Throwable;

class HybridSearchController extends SearchController
{
    private const PER_PAGE = 16;

    public function __construct(
        private SemanticSearchService $semanticSearch,
        private DiscoveryRanker $ranker,
    ) {}

    public function semanticSearch(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:100',
            'q' => 'nullable|string|max:100',
        ]);
        $q = trim((string) ($data['search'] ?? $data['q'] ?? ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $page = max(1, (int) $request->integer('page', 1));
        $maxPages = max(1, (int) config('discovery.semantic.max_pages', 6));
        if ($page > $maxPages || ! (bool) config('discovery.semantic.enabled', true)) {
            return $this->keywordSearch($request, $q);
        }

        $candidateLimit = max(
            self::PER_PAGE,
            min(200, (int) config('discovery.semantic.candidate_limit', 96)),
        );
        $lexicalIds = $this->lexicalCandidateIds($request, $q, $candidateLimit);
        $semanticIds = [];
        $semanticUsed = false;

        try {
            $semantic = $this->semanticSearch->search(
                $q,
                $candidateLimit,
                $request->filled('category') ? (string) $request->category : null,
                $request->filled('state') ? trim((string) $request->state) : null,
                $request->filled('min_price') ? (float) $request->min_price : null,
                $request->filled('max_price') ? (float) $request->max_price : null,
                max(0.05, min(1.0, 1 - (float) config('discovery.semantic.max_distance', 0.35))),
            );
            $semanticUsed = ! (bool) ($semantic['fallback'] ?? true);
            $semanticIds = collect($semantic['results'] ?? [])
                ->when($request->filled('condition'), function ($items) use ($request) {
                    $allowed = is_array($request->condition)
                        ? $request->condition
                        : explode(',', (string) $request->condition);

                    return $items->filter(fn ($ad) => in_array($ad->condition, $allowed, true));
                })
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->values()
                ->all();
        } catch (Throwable) {
            $semanticIds = [];
            $semanticUsed = false;
        }

        $candidateIds = array_values(array_unique([...$lexicalIds, ...$semanticIds]));
        if ($candidateIds === []) {
            return $this->keywordSearch($request, $q);
        }

        $sponsoredIds = Ad::query()
            ->whereIn('id', $candidateIds)
            ->whereNotNull('promoted')
            ->where(function ($builder) {
                $builder->whereNull('boost_expires_at')->orWhere('boost_expires_at', '>', now());
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $scores = $this->ranker->fuse($lexicalIds, $semanticIds, $sponsoredIds);
        $orderedIds = array_keys($scores);
        $ads = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
            ->whereIn('ads.id', $orderedIds)
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->where(function ($builder) {
                $builder->whereNull('ads.expires_at')->orWhere('ads.expires_at', '>', now());
            });
        $this->applyCommonFilters($ads, $request);
        $byId = $ads->get()->keyBy('id');
        $ranked = collect($orderedIds)
            ->map(fn ($id) => $byId->get($id))
            ->filter()
            ->values();

        $slice = $ranked->slice(($page - 1) * self::PER_PAGE, self::PER_PAGE)->values();
        $paginator = new LengthAwarePaginator(
            $slice,
            $ranked->count(),
            self::PER_PAGE,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );
        $payload = $paginator->toArray();
        $payload['discovery'] = [
            'mode' => 'hybrid_rrf',
            'semantic_used' => $semanticUsed,
            'lexical_candidates' => count($lexicalIds),
            'semantic_candidates' => count($semanticIds),
        ];

        return response()->json($payload);
    }

    /** @return list<int> */
    private function lexicalCandidateIds(Request $request, string $q, int $limit): array
    {
        $term = SqlLikePattern::contains(mb_strtolower($q, 'UTF-8'));
        $titleLike = $this->caseInsensitiveContainsExpression('ads.title');
        $descriptionLike = $this->caseInsensitiveContainsExpression('ads.description');
        $query = Ad::query()
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->where(function ($builder) {
                $builder->whereNull('ads.expires_at')->orWhere('ads.expires_at', '>', now());
            })
            ->where(function ($builder) use ($term, $titleLike, $descriptionLike) {
                $builder->whereRaw($titleLike, [$term])->orWhereRaw($descriptionLike, [$term]);
            });
        $this->applyCommonFilters($query, $request);

        return $query
            ->orderByRaw("CASE WHEN {$titleLike} THEN 0 ELSE 1 END", [$term])
            ->orderByDesc('ads.created_at')
            ->limit($limit)
            ->pluck('ads.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function keywordSearch(Request $request, string $q)
    {
        $normalizedQ = mb_strtolower($q, 'UTF-8');
        $term = SqlLikePattern::contains($normalizedQ);
        $supportsTrigram = $this->supportsTrigram();
        $titleLike = $this->caseInsensitiveContainsExpression('ads.title');
        $descriptionLike = $this->caseInsensitiveContainsExpression('ads.description');
        $query = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->where(function ($builder) {
                $builder->whereNull('ads.expires_at')->orWhere('ads.expires_at', '>', now());
            })
            ->where(function ($builder) use ($term, $normalizedQ, $supportsTrigram, $titleLike, $descriptionLike) {
                $builder->whereRaw($titleLike, [$term])
                    ->orWhereRaw($descriptionLike, [$term]);
                if ($supportsTrigram && mb_strlen($normalizedQ) >= 3) {
                    $builder->orWhereRaw('ads.title %> ?', [$normalizedQ]);
                }
            });
        $this->applyCommonFilters($query, $request);
        $query->orderByRaw(
            "CASE WHEN {$titleLike} THEN 0 WHEN {$descriptionLike} THEN 1 ELSE 2 END",
            [$term, $term],
        );
        if ($supportsTrigram && mb_strlen($normalizedQ) >= 3) {
            $query->orderByRaw('word_similarity(?, ads.title) DESC', [$normalizedQ]);
        }
        $query->orderByDesc('ads.created_at');

        return response()->json($query->paginate(self::PER_PAGE));
    }

    private function applyCommonFilters($query, Request $request): void
    {
        if ($request->filled('category')) {
            $query->where('ads.category', $request->category);
        }
        if ($request->filled('state')) {
            $state = trim((string) $request->state);
            if ($state !== '') {
                $query->whereRaw(
                    SqlLikePattern::clause('ads.state ILIKE ?'),
                    [SqlLikePattern::escape($state)],
                );
            }
        }
        if ($request->filled('min_price')) {
            $query->where('ads.price', '>=', (float) $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('ads.price', '<=', (float) $request->max_price);
        }
        if ($request->filled('condition')) {
            $conditions = is_array($request->condition) ? $request->condition : explode(',', (string) $request->condition);
            $query->whereIn('ads.condition', $conditions);
        }
    }

    private function caseInsensitiveContainsExpression(string $column): string
    {
        return SqlLikePattern::clause(
            DB::connection()->getDriverName() === 'pgsql'
                ? "{$column} ILIKE ?"
                : "LOWER({$column}) LIKE ?",
        );
    }

    private function supportsTrigram(): bool
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return false;
        }

        return Cache::remember('search:pg_trgm_available', 3600, static function (): bool {
            $row = DB::selectOne("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS available");

            return filter_var($row->available ?? false, FILTER_VALIDATE_BOOL);
        });
    }
}
