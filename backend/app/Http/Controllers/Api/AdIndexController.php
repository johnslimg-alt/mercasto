<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Support\AdQueryFilters;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AdIndexController extends Controller
{
    private const PUBLIC_AD_USER_COLUMNS = 'id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp';

    /**
     * Public ad listing endpoint with global and category-specific filters.
     */
    public function index(Request $request)
    {
        $request->validate(['search' => 'nullable|string|max:100']);

        $page = (int) $request->query('page', 1);
        if ($page > 100) {
            return response()->json(['message' => 'Límite de paginación excedido para proteger la base de datos.'], 400);
        }

        $query = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS);

        if ($request->filled('lat') && $request->filled('lng') && $request->filled('radius')) {
            $lat = (float) $request->lat;
            $lng = (float) $request->lng;
            $radius = (int) $request->radius;

            $haversine = "( 6371 * acos( greatest(-1.0, least(1.0, cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) ) )";

            $query->selectRaw("*, {$haversine} AS distance", [$lat, $lng, $lat])
                ->where('status', 'active')
                ->whereNotNull('latitude')
                ->whereRaw("{$haversine} < ?", [$lat, $lng, $lat, $radius])
                ->orderBy('distance');
        } else {
            $query->where('ads.status', 'active');
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('subcategory')) {
            $query->whereRaw('subcategory ILIKE ?', [(string) $request->subcategory]);
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->search);

            if ($search !== '') {
                $like = '%' . mb_strtolower($search, 'UTF-8') . '%';
                $titleLike = $this->caseInsensitiveContainsExpression('title');
                $descriptionLike = $this->caseInsensitiveContainsExpression('description');

                // Public catalog search is deterministic and index-compatible. Semantic ranking
                // belongs to /api/search/semantic, whose canonical storage is embeddings.embedding.
                $query->where(function ($sub) use ($like, $titleLike, $descriptionLike): void {
                    $sub->whereRaw($titleLike, [$like])
                        ->orWhereRaw($descriptionLike, [$like]);
                });
                $query->orderByRaw("CASE WHEN {$titleLike} THEN 0 ELSE 1 END", [$like]);
            }
        }

        if ($request->filled('location')) {
            $location = trim((string) $request->location);
            $normalizedLocation = mb_strtolower($location);
            $allMexicoAliases = ['todo mexico', 'todo méxico', 'all mexico', 'mexico', 'méxico'];

            if (! in_array($normalizedLocation, $allMexicoAliases, true)) {
                $locationParts = collect([$location])
                    ->merge(explode(',', $location))
                    ->merge(explode('·', $location))
                    ->merge(explode('-', $location))
                    ->map(fn ($part) => trim($part))
                    ->filter()
                    ->unique()
                    ->values();

                $query->where(function ($q) use ($locationParts): void {
                    foreach ($locationParts as $index => $part) {
                        $like = '%' . $part . '%';
                        $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';

                        $q->{$method}('location ILIKE ? OR state ILIKE ?', [$like, $like]);
                    }
                });
            }
        }

        if ($request->filled('state')) {
            $state = trim((string) $request->state);

            if ($state !== '') {
                $query->whereRaw('state ILIKE ?', [$state]);
            }
        }

        if ($request->filled('city')) {
            $cityParts = collect(explode(',', (string) $request->city))
                ->map(fn ($part) => trim($part))
                ->filter()
                ->unique()
                ->values();

            $query->where(function ($q) use ($cityParts): void {
                foreach ($cityParts as $index => $part) {
                    $like = '%' . $part . '%';
                    $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';

                    $q->{$method}('location ILIKE ?', [$like]);
                }
            });
        }

        if ($request->boolean('has_coords')) {
            $query->whereNotNull('latitude')
                ->whereNotNull('longitude');
        }

        if ($request->filled('condition')) {
            $conditions = is_array($request->condition) ? $request->condition : explode(',', (string) $request->condition);
            $query->whereIn('condition', $conditions);
        }

        AdQueryFilters::apply($query, $request);

        $sort = $request->query('sort') ?: AdQueryFilters::sortFromFilter($request) ?: 'latest';
        if ($sort === 'price_asc') {
            $query->orderBy('price', 'asc');
        } elseif ($sort === 'price_desc') {
            $query->orderBy('price', 'desc');
        } elseif ($sort === 'popular') {
            $query->orderBy('views', 'desc');
        } elseif ($sort === 'latest' && ! $request->filled('radius')) {
            $query->orderByRaw("
                CASE
                    WHEN promoted = 'destacado' AND (boost_expires_at IS NULL OR boost_expires_at > CURRENT_TIMESTAMP) THEN 0
                    WHEN promoted = 'highlight' AND (boost_expires_at IS NULL OR boost_expires_at > CURRENT_TIMESTAMP) THEN 1
                    WHEN promoted = 'urgente' AND (boost_expires_at IS NULL OR boost_expires_at > CURRENT_TIMESTAMP) THEN 2
                    ELSE 3
                END
            ");
            $query->latest();
        }

        $hasFilters = $request->anyFilled([
            'lat',
            'lng',
            'radius',
            'user_id',
            'category',
            'subcategory',
            'search',
            'location',
            'city',
            'state',
            'min_price',
            'max_price',
            'condition',
            'sort',
            'has_coords',
        ]) || AdQueryFilters::hasAdvancedFilters($request);

        if (! $hasFilters && $page <= 10) {
            $cacheKey = "ads_index_page_{$page}";

            return response()->json(Cache::remember($cacheKey, 60, function () use ($query) {
                return $query->paginate(16)->toArray();
            }));
        }

        return response()->json($query->paginate(16));
    }

    private function caseInsensitiveContainsExpression(string $column): string
    {
        return DB::connection()->getDriverName() === 'pgsql'
            ? "{$column} ILIKE ?"
            : "LOWER({$column}) LIKE ?";
    }

    /**
     * Featured / Destacados endpoint — up to 8 promoted ads, randomised, cached 2 minutes.
     * Used by the premium «Destacados» block on the home feed.
     */
    public function featured()
    {
        $cacheKey = 'ads_featured_block';

        $ads = Cache::remember($cacheKey, 120, function () {
            return Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
                ->where('status', 'active')
                ->where('promoted', 'destacado')
                ->where(function ($query) {
                    $query->whereNull('boost_expires_at')
                        ->orWhere('boost_expires_at', '>', now());
                })
                ->inRandomOrder()
                ->limit(8)
                ->get();
        });

        return response()->json(['data' => $ads]);
    }
}
