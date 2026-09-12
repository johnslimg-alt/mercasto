<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Ad;
use App\Support\ListingIndexability;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class SitemapController extends Controller
{
    /**
     * Google allows 50,000 URLs / 50 MB per sitemap file. Chunk below that so a growing
     * marketplace never produces a truncated or rejected file.
     */
    public const ADS_URLS_PER_CHUNK = 45000;

    private const ADS_MAX_FILE_BYTES = 50000000;
    private const ADS_CACHE_TTL = 1800;

    /** Mirrors ListingQualityPreflightService: below these minimums a listing is thin. */
    private const ADS_MIN_TITLE_LENGTH = 3;
    private const ADS_MIN_DESCRIPTION_LENGTH = 10;

    /** Same legacy placeholder titles the content-quality audit refuses to treat as content. */
    private const ADS_PLACEHOLDER_TITLES = [
        'asdf',
        'demo',
        'lorem' . ' ipsum',
        'lorem' . ' ipsum dolor sit amet',
        'prueba',
        'qwerty',
        'test',
        'testing',
        'wrefrg',
    ];

    private const MEXICO_STATES = [
        'aguascalientes', 'baja-california', 'baja-california-sur', 'campeche',
        'chiapas', 'chihuahua', 'ciudad-de-mexico', 'coahuila', 'colima',
        'durango', 'estado-de-mexico', 'guanajuato', 'guerrero', 'hidalgo',
        'jalisco', 'michoacan', 'morelos', 'nayarit', 'nuevo-leon', 'oaxaca',
        'puebla', 'queretaro', 'quintana-roo', 'san-luis-potosi', 'sinaloa',
        'sonora', 'tabasco', 'tamaulipas', 'tlaxcala', 'veracruz',
        'yucatan', 'zacatecas'
    ];

    public function index()
    {
        $content = Cache::remember('sitemap_main_v3', 3600, function () {
            return $this->generateMainSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function categories()
    {
        $content = Cache::remember('sitemap_categories_v4', 3600, function () {
            return $this->generateCategoriesSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function states()
    {
        $content = Cache::remember('sitemap_states_v3', 3600, function () {
            return $this->generateStatesSitemap();
        });

        return response($content, 200)
            ->header('Content-Type', 'application/xml');
    }

    public function ads()
    {
        return $this->adsChunkResponse(1);
    }

    public function adsChunk(int $chunk)
    {
        return $this->adsChunkResponse($chunk);
    }

    private function adsChunkResponse(int $chunk): Response
    {
        abort_unless($chunk >= 1 && $chunk <= $this->adsChunkCount(), 404);

        $payload = $this->adsPayload($chunk);
        $health = $payload['health'];

        // An empty ads sitemap is only acceptable when the marketplace genuinely has no
        // indexable listing. If real, publicly visible inventory exists and none of it is
        // indexable the generator is broken: answer 503 instead of publishing a "zero URLs"
        // sitemap, so crawlers keep the last known good copy and operators get alerted.
        $failing = $health['level'] === 'error'
            && (bool) config('marketplace.ads_sitemap.fail_on_broken_inventory', true);

        $response = response($payload['xml'], $failing ? 503 : 200)
            ->header('Content-Type', 'application/xml')
            ->header('X-Mercasto-Sitemap-Urls', (string) $payload['urls'])
            ->header('X-Mercasto-Sitemap-Health', $health['reason']);

        if ($failing) {
            $response->header('Retry-After', '900');
        }

        return $response;
    }

    public function sitemapIndex()
    {
        $baseUrl = rtrim((string) config('app.url'), '/');
        $now = now()->toW3cString();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        
        $sitemaps = [
            ['loc' => "{$baseUrl}/sitemap-main.xml", 'lastmod' => $now],
            ['loc' => "{$baseUrl}/sitemap-categories.xml", 'lastmod' => $now],
        ];

        // Listing inventory is chunked: chunk 1 keeps the historical `/sitemap-ads.xml` name,
        // later chunks are `/sitemap-ads-{n}.xml`. Sitemap indexes must not nest, so every
        // chunk is advertised here directly.
        foreach (range(1, $this->adsChunkCount()) as $chunk) {
            $sitemaps[] = [
                'loc' => $chunk === 1
                    ? "{$baseUrl}/sitemap-ads.xml"
                    : "{$baseUrl}/sitemap-ads-{$chunk}.xml",
                'lastmod' => $now,
            ];
        }

        foreach ($sitemaps as $sitemap) {
            $xml .= "  <sitemap>\n";
            $xml .= "    <loc>{$sitemap['loc']}</loc>\n";
            $xml .= "    <lastmod>{$sitemap['lastmod']}</lastmod>\n";
            $xml .= "  </sitemap>\n";
        }

        $xml .= "</sitemapindex>\n";

        return response($xml, 200)
            ->header('Content-Type', 'application/xml');
    }

    private function generateMainSitemap()
    {
        $baseUrl = config('app.url');
        $now = now()->toW3cString();

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        // Главная страница
        $xml .= $this->urlEntry($baseUrl . '/', 'daily', '1.0', $now);

        // Основные вертикали
        $verticals = [
            'motor', 'inmuebles', 'servicios', 'empleos', 'electronica',
            'hogar', 'moda', 'ocio', 'infantil', 'mascotas', 'negocios',
            'boletos', 'tiendas', 'turismo', 'productos',
        ];
        foreach ($verticals as $vertical) {
            $xml .= $this->urlEntry("{$baseUrl}/{$vertical}", 'daily', '0.9', $now);
        }

        // Factual source pages and legal pages with canonical frontend routes.
        $legalPages = [
            'vendedores' => ['weekly', '0.9'],
            'como-funciona' => ['monthly', '0.8'],
            'seguridad' => ['monthly', '0.8'],
            'ayuda/publicar-anuncio' => ['monthly', '0.8'],
            'ayuda/comprar-y-contactar' => ['monthly', '0.8'],
            'tarifas' => ['monthly', '0.8'],
            'sobre-mercasto' => ['monthly', '0.7'],
            'terminos' => ['monthly', '0.6'],
            'privacidad' => ['monthly', '0.6'],
            'cookies' => ['monthly', '0.5'],
            'contacto' => ['monthly', '0.5'],
            'ayuda' => ['monthly', '0.5'],
            'reembolsos/' => ['monthly', '0.5'],
            'moderacion/' => ['monthly', '0.5'],
        ];

        foreach ($legalPages as $page => [$freq, $priority]) {
            $xml .= $this->urlEntry("{$baseUrl}/{$page}", $freq, $priority, $now);
        }

        $xml .= "</urlset>\n";
        return $xml;
    }

    private function generateCategoriesSitemap()
    {
        $baseUrl = config('app.url');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        $categories = Category::all();
        
        $verticalRoutes = [
            'motor' => 'motor',
            'inmobiliaria' => 'inmuebles',
            'empleo' => 'empleos',
            'servicios' => 'servicios',
            'electronica' => 'electronica',
            'hogar' => 'hogar',
            'moda' => 'moda',
            'ocio' => 'ocio',
            'infantil' => 'infantil',
            'mascotas' => 'mascotas',
            'negocios' => 'negocios',
            'boletos' => 'boletos',
            'turismo' => 'turismo',
            'productos' => 'productos',
        ];

        $seenUrls = [];
        foreach ($categories as $category) {
            $route = $verticalRoutes[$category->slug] ?? null;
            if (!$route) {
                // Query-filter pages canonicalize to the generic catalog/home and must not
                // be advertised as standalone search landing pages.
                continue;
            }
            $url = "{$baseUrl}/{$route}";
            if (isset($seenUrls[$url])) {
                continue;
            }
            $seenUrls[$url] = true;
            $xml .= $this->urlEntry(
                $url,
                'daily',
                '0.8',
                ($category->updated_at ? $category->updated_at->toW3cString() : now()->toW3cString())
            );
        }

        $xml .= "</urlset>\n";
        return $xml;
    }

    private function generateStatesSitemap()
    {
        // State-filter URLs currently canonicalize to the homepage. Keep the legacy
        // endpoint valid but empty until dedicated state landing routes exist.
        return '<?xml version="1.0" encoding="UTF-8"?>' . "\n" .
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n" .
            "</urlset>\n";
    }

    /**
     * Drop every cached artifact of the canonical ads sitemap.
     *
     * The sitemap is cached for 30 minutes, so without this any code path that changes which
     * listings are publicly visible (publish, pause, archive, expire, seller re-confirmation,
     * moderation reconciliation, deletion) keeps advertising the previous inventory. Call it
     * from model-event paths through AdObserver and explicitly from query-builder bulk updates,
     * which do not fire model events.
     */
    public static function forgetAdsCache(): void
    {
        $chunks = max(1, (int) Cache::get('sitemap_ads_chunk_count_v1', 1));

        Cache::forget('sitemap_ads_v4');
        Cache::forget('sitemap_ads_chunk_count_v1');

        // Chunks 2..n, plus one spare so a growing inventory never leaves a stale tail chunk.
        for ($chunk = 2; $chunk <= $chunks + 1; $chunk++) {
            Cache::forget("sitemap_ads_v4_chunk_{$chunk}");
        }
    }

    /**
     * Number of `/sitemap-ads*.xml` chunks the eligible inventory needs.
     *
     * Deliberately derived from the SQL-expressible part of the contract only: the per-listing
     * thin/duplicate curation below can only ever shrink a chunk, never overflow one.
     */
    private function adsChunkCount(): int
    {
        return Cache::remember('sitemap_ads_chunk_count_v1', self::ADS_CACHE_TTL, function (): int {
            return max(1, (int) ceil(
                ListingIndexability::apply(Ad::query())->count() / $this->adsUrlsPerChunk()
            ));
        });
    }

    private function adsUrlsPerChunk(): int
    {
        return max(1, (int) config('marketplace.ads_sitemap.urls_per_chunk', self::ADS_URLS_PER_CHUNK));
    }

    /**
     * @return array{xml: string, urls: int, eligible: int, chunks: int, excluded: array<string, int>, health: array{level: string, reason: string}}
     */
    private function adsPayload(int $chunk): array
    {
        $build = function () use ($chunk): array {
            return $this->buildAdsSitemapChunk($chunk);
        };

        // Chunk 1 keeps the historical cache key so existing cache-busting call sites keep working.
        if ($chunk === 1) {
            return Cache::remember('sitemap_ads_v4', self::ADS_CACHE_TTL, $build);
        }

        return Cache::remember("sitemap_ads_v4_chunk_{$chunk}", self::ADS_CACHE_TTL, $build);
    }

    /**
     * @return array{xml: string, urls: int, eligible: int, chunks: int, excluded: array<string, int>, health: array{level: string, reason: string}}
     */
    private function buildAdsSitemapChunk(int $chunk): array
    {
        $baseUrl = rtrim((string) config('app.url'), '/');
        $perChunk = $this->adsUrlsPerChunk();
        $offset = ($chunk - 1) * $perChunk;

        $excluded = ['thin' => 0, 'placeholder_title' => 0, 'duplicate' => 0];
        // Fingerprints of the listings kept so far, used to drop older re-posts. Memory is
        // O(indexable inventory) at roughly 100 bytes per listing (229 real listings today);
        // a marketplace in the millions should move duplicate detection into SQL.
        $fingerprints = [];
        $eligible = 0;
        $entries = [];

        $query = ListingIndexability::apply(Ad::query())
            ->orderByDesc('ads.updated_at')
            ->orderByDesc('ads.id')
            ->select([
                'ads.id', 'ads.title', 'ads.description', 'ads.price', 'ads.category',
                'ads.state', 'ads.city', 'ads.updated_at', 'ads.created_at',
            ]);

        foreach ($query->cursor() as $ad) {
            $reason = $this->adsExclusionReason($ad, $fingerprints);
            if ($reason !== null) {
                $excluded[$reason]++;
                continue;
            }

            if ($eligible >= $offset && count($entries) < $perChunk) {
                $entries[] = [
                    'loc' => "{$baseUrl}/ads/{$ad->id}",
                    'lastmod' => $this->adsLastmod($ad),
                ];
            }

            $eligible++;
        }

        if ($entries === [] && $eligible > 0) {
            // Eligible inventory exists, yet the chunk is empty: the generator itself is broken.
            Log::critical('ads_sitemap.eligible_inventory_not_published', [
                'chunk' => $chunk,
                'eligible' => $eligible,
                'excluded' => $excluded,
            ]);

            throw new RuntimeException(
                "Ads sitemap chunk {$chunk} produced 0 URLs while {$eligible} eligible listings exist."
            );
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        foreach ($entries as $entry) {
            $xml .= $this->urlEntry($entry['loc'], 'daily', '0.7', $entry['lastmod']);
        }
        $xml .= "</urlset>\n";

        if (strlen($xml) > self::ADS_MAX_FILE_BYTES) {
            Log::critical('ads_sitemap.chunk_exceeds_byte_limit', [
                'chunk' => $chunk,
                'bytes' => strlen($xml),
                'urls' => count($entries),
            ]);

            throw new RuntimeException("Ads sitemap chunk {$chunk} exceeds the 50 MB sitemap limit.");
        }

        return [
            'xml' => $xml,
            'urls' => count($entries),
            'eligible' => $eligible,
            'chunks' => $this->adsChunkCount(),
            'excluded' => $excluded,
            'health' => $this->adsHealth($chunk, count($entries), $eligible, $excluded),
        ];
    }

    /**
     * Sitemap-only curation on top of the shared indexability contract: a sitemap must list
     * fewer (never more) URLs than the set of indexable pages.
     *
     * @param  array<string, bool>  $fingerprints  already-published content fingerprints
     */
    private function adsExclusionReason(Ad $ad, array &$fingerprints): ?string
    {
        $title = trim(strip_tags((string) $ad->title));
        $description = trim(strip_tags((string) $ad->description));

        if (mb_strlen($title) < self::ADS_MIN_TITLE_LENGTH
            || mb_strlen($description) < self::ADS_MIN_DESCRIPTION_LENGTH) {
            return 'thin';
        }

        if (in_array(Str::lower(Str::squish($title)), self::ADS_PLACEHOLDER_TITLES, true)) {
            return 'placeholder_title';
        }

        // Listings are streamed newest-first, so the first occurrence of a content fingerprint
        // is the canonical one and older re-posts are dropped as duplicates.
        $fingerprint = $this->adsContentFingerprint($ad);
        if ($fingerprint !== '') {
            if (isset($fingerprints[$fingerprint])) {
                return 'duplicate';
            }
            $fingerprints[$fingerprint] = true;
        }

        return null;
    }

    /** Same recipe as `ads:audit-active-content-quality` so both tools mean the same duplicate. */
    private function adsContentFingerprint(Ad $ad): string
    {
        $title = Str::lower(Str::squish(strip_tags((string) $ad->title)));
        $description = Str::lower(Str::squish(strip_tags((string) $ad->description)));

        if ($title === '' && $description === '') {
            return '';
        }

        return hash('sha256', implode('|', [
            $title,
            $description,
            number_format((float) $ad->price, 2, '.', ''),
            Str::lower(trim((string) $ad->category)),
            Str::lower(trim((string) $ad->state)),
            Str::lower(trim((string) $ad->city)),
        ]));
    }

    /** Crawlers ignore (and can distrust) future lastmod values, so clamp them to now. */
    private function adsLastmod(Ad $ad): string
    {
        $lastmod = $ad->updated_at?->copy() ?? $ad->created_at?->copy();

        if ($lastmod === null || $lastmod->isFuture()) {
            return now()->toW3cString();
        }

        return $lastmod->toW3cString();
    }

    /**
     * @param  array<string, int>  $excluded
     * @return array{level: string, reason: string}
     */
    private function adsHealth(int $chunk, int $urls, int $eligible, array $excluded): array
    {
        $context = [
            'chunk' => $chunk,
            'urls' => $urls,
            'eligible' => $eligible,
            'excluded' => $excluded,
        ];

        if ($urls > 0) {
            if (array_sum($excluded) > 0) {
                Log::warning('ads_sitemap.listings_excluded_from_sitemap', $context);
            }

            return ['level' => 'ok', 'reason' => 'ok'];
        }

        if ($chunk > 1) {
            // Curation trimmed this trailing chunk empty: honest, but keep it visible.
            Log::warning('ads_sitemap.trailing_chunk_empty_after_curation', $context);

            return ['level' => 'warning', 'reason' => 'trailing_chunk_empty'];
        }

        $visibleReal = Ad::query()
            ->where('ads.is_catalog_filler', false)
            ->where('ads.status', 'active')
            ->count();
        $realTotal = Ad::query()->where('ads.is_catalog_filler', false)->count();

        $context['visible_real_listings'] = $visibleReal;
        $context['real_listings'] = $realTotal;

        if ($visibleReal > 0) {
            // Publicly visible real listings exist but none is indexable: the exact state that
            // silently emptied sitemap-ads.xml. Never let this pass unnoticed again.
            Log::error('ads_sitemap.visible_inventory_not_indexable', $context);

            return ['level' => 'error', 'reason' => 'visible_inventory_not_indexable'];
        }

        if ($realTotal > 0) {
            // Real listings exist but none is publicly visible (paused/archived/expired):
            // an empty ads sitemap is correct here, only worth a warning.
            Log::warning('ads_sitemap.no_visible_inventory', $context);

            return ['level' => 'warning', 'reason' => 'no_visible_inventory'];
        }

        Log::warning('ads_sitemap.no_listing_inventory', $context);

        return ['level' => 'warning', 'reason' => 'no_listing_inventory'];
    }

    private function urlEntry($loc, $changefreq, $priority, $lastmod)
    {
        return "  <url>\n" .
               "    <loc>{$loc}</loc>\n" .
               "    <lastmod>{$lastmod}</lastmod>\n" .
               "    <changefreq>{$changefreq}</changefreq>\n" .
               "    <priority>{$priority}</priority>\n" .
               "  </url>\n";
    }
}
