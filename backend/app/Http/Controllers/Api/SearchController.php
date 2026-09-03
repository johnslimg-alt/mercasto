<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Support\SqlLikePattern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

class SearchController extends Controller
{
    private const MAX_SEMANTIC_DISTANCE = 0.35;
    private const MIN_EXACT_KEYWORD_RESULTS = 3;

    public function semanticSearch(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:100',
            'q' => 'nullable|string|max:100',
        ]);

        $q = trim((string) ($data['search'] ?? ''));
        if ($q === '') {
            $q = trim((string) ($data['q'] ?? ''));
        }

        if (mb_strlen($q) < 2) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        if ($this->hasGenuineSemanticCoverage()) {
            $ollamaHost = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');

            try {
                $response = Http::timeout(15)->post($ollamaHost.'/api/embeddings', [
                    'model' => 'nomic-embed-text',
                    'prompt' => $q,
                ]);
                $embedding = $response->successful() ? $response->json('embedding') : null;

                if (is_array($embedding) && $embedding !== []) {
                    $embeddingString = '['.implode(',', $embedding).']';

                    $query = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
                        ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
                        ->selectRaw('ads.*, (embeddings.embedding <=> ?) AS vec_distance', [$embeddingString])
                        ->where('ads.status', 'active')
                        ->where('ads.is_catalog_filler', false)
                        ->whereRaw('(embeddings.embedding <=> ?) <= ?', [
                            $embeddingString,
                            self::MAX_SEMANTIC_DISTANCE,
                        ]);

                    $this->applyCommonFilters($query, $request, 'ads');
                    $query->orderBy('vec_distance', 'asc');

                    $results = $query->paginate(16);
                    if ($results->total() > 0) {
                        return response()->json($results);
                    }
                }
            } catch (Throwable) {
                // A missing embedding service/table/extension must fall back to keyword search.
            }
        }

        return $this->keywordSearch($request, $q);
    }

    /**
     * Keyword + fuzzy search fallback when semantic embeddings are unavailable.
     */
    private function keywordSearch(Request $request, string $q)
    {
        $normalizedQ = mb_strtolower($q, 'UTF-8');
        $term = SqlLikePattern::contains($normalizedQ);
        $supportsTrigram = $this->supportsTrigram();
        $titleLike = $this->caseInsensitiveContainsExpression('ads.title');
        $descriptionLike = $this->caseInsensitiveContainsExpression('ads.description');

        $exactQuery = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
            ->where('ads.status', 'active')
            ->where(function ($sub) use ($term, $titleLike, $descriptionLike) {
                $sub->whereRaw($titleLike, [$term])
                    ->orWhereRaw($descriptionLike, [$term]);
            });

        $this->applyCommonFilters($exactQuery, $request);
        $exactQuery
            ->orderByRaw("CASE WHEN {$titleLike} THEN 0 ELSE 1 END", [$term])
            ->orderByDesc('ads.created_at');

        $exactResults = $exactQuery->paginate(16);
        if (! $supportsTrigram || $exactResults->total() >= self::MIN_EXACT_KEYWORD_RESULTS) {
            return response()->json($exactResults);
        }

        // Sparse exact results only: add an index-supported pg_trgm word-similarity fallback.
        $query = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
            ->where('ads.status', 'active')
            ->where(function ($sub) use ($term, $normalizedQ, $titleLike, $descriptionLike) {
                $sub->where(function ($exact) use ($term, $titleLike, $descriptionLike) {
                    $exact->whereRaw($titleLike, [$term])
                        ->orWhereRaw($descriptionLike, [$term]);
                })->orWhereRaw('ads.title %> ?', [$normalizedQ]);
            });

        $this->applyCommonFilters($query, $request);
        $query
            ->orderByRaw(
                "CASE WHEN {$titleLike} THEN 0 WHEN {$descriptionLike} THEN 1 ELSE 2 END",
                [$term, $term],
            )
            ->orderByRaw('word_similarity(?, ads.title) DESC', [$normalizedQ])
            ->orderByDesc('ads.created_at');

        return response()->json($query->paginate(16));
    }

    /**
     * Autocomplete suggestions with fuzzy fallback.
     */
    public function suggestions(Request $request)
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:80',
        ]);

        $q = trim($data['q'] ?? '');

        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $normalizedQuery = mb_strtolower($q, 'UTF-8');
        $cacheKey = 'suggestions:v2:'.md5($normalizedQuery);

        $suggestions = Cache::remember($cacheKey, 300, function () use ($normalizedQuery) {
            $term = SqlLikePattern::contains($normalizedQuery);
            $titleLike = $this->caseInsensitiveContainsExpression('title');
            $stateLike = $this->caseInsensitiveContainsExpression('state');
            $locationLike = $this->caseInsensitiveContainsExpression('location');

            // 1. Ads titles — index-compatible exact contains
            $ads = DB::table('ads')
                ->where('status', 'active')
                ->whereRaw($titleLike, [$term])
                ->select('title')
                ->distinct()
                ->limit(6)
                ->pluck('title');

            // 2. Categories
            $categories = DB::table('categories')
                ->select('name', 'slug')
                ->get()
                ->map(fn ($category) => $this->localizedCategoryName($category->name, $category->slug))
                ->filter(fn ($title) => str_contains(mb_strtolower($title, 'UTF-8'), $normalizedQuery))
                ->take(3)
                ->values();

            // 3. States
            $states = DB::table('ads')
                ->where('status', 'active')
                ->whereNotNull('state')
                ->whereRaw($stateLike, [$term])
                ->select('state')
                ->distinct()
                ->limit(3)
                ->pluck('state');

            // 4. Cities
            $cities = DB::table('ads')
                ->where('status', 'active')
                ->whereNotNull('location')
                ->whereRaw($locationLike, [$term])
                ->select('location')
                ->distinct()
                ->limit(4)
                ->pluck('location')
                ->map(function ($loc) {
                    $parts = explode(',', $loc);

                    return trim($parts[0]);
                })
                ->filter(fn ($l) => str_contains(mb_strtolower($l, 'UTF-8'), $normalizedQuery))
                ->unique()
                ->values();

            // 5. Brands
            $brands = DB::table('ads')
                ->where('status', 'active')
                ->whereNotNull('attributes')
                ->where(function ($query) use ($term) {
                    $query->whereRaw(SqlLikePattern::clause("LOWER(attributes->>'marca') LIKE ?"), [$term])
                        ->orWhereRaw(SqlLikePattern::clause("LOWER(attributes->>'brand') LIKE ?"), [$term]);
                })
                ->selectRaw("COALESCE(attributes->>'marca', attributes->>'brand') as brand")
                ->distinct()
                ->limit(3)
                ->pluck('brand')
                ->filter()
                ->values();

            $exact = $ads->merge($categories)->merge($brands)->merge($cities)->merge($states)->unique();

            // 6. Fuzzy fallback via pg_trgm — only when exact results are few
            $fuzzy = collect();
            if (
                $exact->count() < self::MIN_EXACT_KEYWORD_RESULTS
                && mb_strlen($normalizedQuery) >= 3
                && $this->supportsTrigram()
            ) {
                $fuzzy = DB::table('ads')
                    ->where('status', 'active')
                    ->whereRaw('title %> ?', [$normalizedQuery])
                    ->whereRaw(SqlLikePattern::clause('title NOT ILIKE ?'), [$term])
                    ->selectRaw('title, word_similarity(?, title) AS sim', [$normalizedQuery])
                    ->distinct()
                    ->orderByRaw('sim DESC')
                    ->limit(4)
                    ->pluck('title')
                    ->map(fn ($title) => '~'.$title);
            }

            return $exact->merge($fuzzy)->take(8)->values();
        });

        return response()->json($suggestions);
    }

    /**
     * Apply common search filters to a query builder.
     */
    private function applyCommonFilters($query, Request $request, string $tablePrefix = '')
    {
        $prefix = $tablePrefix ? $tablePrefix.'.' : '';

        if ($request->filled('category')) {
            $query->where($prefix.'category', $request->category);
        }
        if ($request->filled('state')) {
            $state = trim((string) $request->state);
            if ($state !== '') {
                $query->whereRaw(
                    SqlLikePattern::clause($prefix.'state ILIKE ?'),
                    [SqlLikePattern::escape($state)],
                );
            }
        }
        if ($request->filled('min_price')) {
            $query->where($prefix.'price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where($prefix.'price', '<=', $request->max_price);
        }
        if ($request->filled('condition')) {
            $conditions = is_array($request->condition) ? $request->condition : explode(',', (string) $request->condition);
            $query->whereIn($prefix.'condition', $conditions);
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

    private function hasGenuineSemanticCoverage(): bool
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return true;
        }

        return Cache::remember('search:genuine_semantic_coverage', 300, static function (): bool {
            try {
                return DB::table('embeddings')
                    ->join('ads', 'ads.id', '=', 'embeddings.ad_id')
                    ->where('ads.status', 'active')
                    ->where('ads.is_catalog_filler', false)
                    ->exists();
            } catch (Throwable) {
                return false;
            }
        });
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

    private function localizedCategoryName($rawName, string $fallback): string
    {
        $decodedName = is_string($rawName) ? json_decode($rawName, true) : $rawName;

        if (is_array($decodedName)) {
            return (string) ($decodedName['es'] ?? $decodedName['en'] ?? reset($decodedName) ?: $fallback);
        }

        return (string) ($rawName ?: $fallback);
    }
}
