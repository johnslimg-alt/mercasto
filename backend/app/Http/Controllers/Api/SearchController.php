<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use App\Models\Ad;

class SearchController extends Controller
{
    public function semanticSearch(Request $request)
    {
        $q = trim($request->query('search', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $ollamaHost = env('OLLAMA_HOST', 'http://mercasto_ollama:11434');
        try {
            $response = Http::timeout(15)->post($ollamaHost . '/api/embeddings', [
                'model' => 'nomic-embed-text',
                'prompt' => $q,
            ]);

            if ($response->successful() && $embedding = $response->json('embedding')) {
                $embeddingString = '[' . implode(',', $embedding) . ']';
                
                $query = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
                    ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
                    ->selectRaw('ads.*, (embeddings.embedding <=> ?) AS vec_distance', [$embeddingString])
                    ->where('ads.status', 'active');

                $this->applyCommonFilters($query, $request, 'ads');
                $query->orderBy('vec_distance', 'asc');

                return response()->json($query->paginate(16));
            }
        } catch (\Exception $e) {
            // fallback to keyword + fuzzy search
        }

        // ── Fallback: keyword search with pg_trgm fuzzy boost ──────────────
        return $this->keywordSearch($request, $q);
    }

    /**
     * Keyword + fuzzy search fallback when semantic embeddings are unavailable.
     */
    private function keywordSearch(Request $request, string $q)
    {
        $normalizedQ = mb_strtolower($q, 'UTF-8');
        $term = '%' . $normalizedQ . '%';

        $query = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
            ->where('ads.status', 'active')
            ->where(function ($sub) use ($term, $normalizedQ) {
                $sub->whereRaw('LOWER(title) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$term]);

                // pg_trgm fuzzy boost — catches typos (e.g. "televizon" → "televisión")
                try {
                    $sub->orWhereRaw('similarity(LOWER(title), ?) > 0.2', [$normalizedQ]);
                } catch (\Exception $e) {
                    // pg_trgm not available, skip fuzzy
                }
            });

        $this->applyCommonFilters($query, $request);

        // Order: exact matches first, then by trgm similarity
        try {
            $query->orderByRaw('similarity(LOWER(title), ?) DESC', [$normalizedQ]);
        } catch (\Exception $e) {
            $query->orderByDesc('created_at');
        }

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
        $cacheKey = 'suggestions:' . md5($normalizedQuery);

        $suggestions = Cache::remember($cacheKey, 300, function () use ($normalizedQuery) {
            $term = '%' . $normalizedQuery . '%';

            // 1. Ads titles — exact LIKE
            $ads = DB::table('ads')
                ->where('status', 'active')
                ->whereRaw('LOWER(title) LIKE ?', [$term])
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
                ->whereRaw('LOWER(state) LIKE ?', [$term])
                ->select('state')
                ->distinct()
                ->limit(3)
                ->pluck('state');

            // 4. Cities
            $cities = DB::table('ads')
                ->where('status', 'active')
                ->whereNotNull('location')
                ->whereRaw('LOWER(location) LIKE ?', [$term])
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
                    $query->whereRaw("LOWER(attributes->>'marca') LIKE ?", [$term])
                          ->orWhereRaw("LOWER(attributes->>'brand') LIKE ?", [$term]);
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
            if ($exact->count() < 3 && mb_strlen($normalizedQuery) >= 3) {
                try {
                    $fuzzy = DB::table('ads')
                        ->where('status', 'active')
                        ->whereRaw('similarity(LOWER(title), ?) > 0.15', [$normalizedQuery])
                        ->whereRaw('LOWER(title) NOT LIKE ?', ['%' . $normalizedQuery . '%']) // only truly fuzzy results
                        ->selectRaw('title, similarity(LOWER(title), ?) AS sim', [$normalizedQuery])
                        ->distinct()
                        ->orderByRaw('sim DESC')
                        ->limit(4)
                        ->pluck('title')
                        ->map(fn ($t) => '~' . $t); // prefix ~ to mark as fuzzy in frontend
                } catch (\Exception $e) {
                    // pg_trgm not available
                }
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
        $prefix = $tablePrefix ? $tablePrefix . '.' : '';

        if ($request->filled('category')) {
            $query->where($prefix . 'category', $request->category);
        }
        if ($request->filled('state')) {
            $state = trim((string) $request->state);
            if ($state !== '') {
                $query->whereRaw($prefix . 'state ILIKE ?', [$state]);
            }
        }
        if ($request->filled('min_price')) {
            $query->where($prefix . 'price', '>=', $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where($prefix . 'price', '<=', $request->max_price);
        }
        if ($request->filled('condition')) {
            $conditions = is_array($request->condition) ? $request->condition : explode(',', (string) $request->condition);
            $query->whereIn($prefix . 'condition', $conditions);
        }
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


