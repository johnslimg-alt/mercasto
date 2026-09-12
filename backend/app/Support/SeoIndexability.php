<?php

namespace App\Support;

use App\Models\Ad;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Crawler indexability policy for public listings and catalog pages.
 *
 * Mirrors `src/utils/seoIndexability.js` so the server-rendered HTML and the
 * hydrated React DOM cannot disagree. Before this existed the two sides each
 * carried their own copy of the rule, which is how filtered result pages ended
 * up `index,follow` in the initial HTML and `noindex,follow` after hydration.
 */
final class SeoIndexability
{
    /** Public listing route proxied to Laravel by nginx (^/ads/[0-9]+/?$). */
    public const LISTING_PATH_PREFIX = '/ads';

    public const ROBOTS_INDEXABLE = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
    /** Catalog/results pages have always shipped the shorter indexable directive. */
    public const ROBOTS_RESULTS_INDEXABLE = 'index,follow,max-image-preview:large';
    public const ROBOTS_NOINDEX = 'noindex,follow,max-image-preview:large';
    public const ROBOTS_PRIVATE = 'noindex,nofollow,noarchive';

    /**
     * Minimum stripped, localized description length for a listing to count as real content.
     * Kept identical to `SitemapController::ADS_MIN_DESCRIPTION_LENGTH` and to the product's own
     * hard publishing floor (`ListingQualityPreflightService`: `description_too_short`), so a
     * listing the ads sitemap publishes can never be thin on the page and vice versa.
     *
     * Note: `ads:audit-active-content-quality` additionally reports a *quality warning* below 60
     * characters and for missing primary images. Those are deliberately NOT index gates — a false
     * `noindex` on a genuine listing is the exact defect this policy exists to remove.
     */
    public const MIN_INDEXABLE_DESCRIPTION_LENGTH = 10;

    /** Kept identical to `SitemapController::ADS_MIN_TITLE_LENGTH`. */
    public const MIN_INDEXABLE_TITLE_LENGTH = 3;

    /**
     * Legacy placeholder titles already tracked by the content-quality audit and the ads sitemap.
     */
    private const PLACEHOLDER_TITLE_PATTERN = '/^(?:asdf|lorem(?:\s+ipsum(?:\s+dolor\s+sit\s+amet)?)?|qwerty|wrefrg|(?:test|testing|demo|prueba)(?:[\s_-]*\d+)?)$/u';

    /**
     * Query keys that only decorate a results page (detail overlays, tracking).
     * Any other parameter marks an actively filtered view.
     */
    private const IGNORED_RESULTS_QUERY_KEYS = [
        'ad', 'store', 'lang', 'locale', 'ref', 'source', 'share',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
        'fbclid', 'gclid', 'msclkid', 'yclid', 'twclid', 'ttclid', 'mc_cid', 'mc_eid', '_gl',
    ];

    /** Absolute canonical URL for a listing. */
    public static function listingUrl(int $id): string
    {
        return url(self::LISTING_PATH_PREFIX . '/' . $id);
    }

    /**
     * Decide whether a listing detail page may be indexed.
     *
     * Two layers, in this order:
     *  1. availability — delegated to {@see ListingIndexability}, the contract shared with the
     *     ads sitemap (not a catalog reference, `status = active`, expiry set and in the future);
     *  2. content quality — placeholder titles and thin copy the ads sitemap also refuses to
     *     publish must not be indexed either, even though the page stays reachable.
     *
     * @return array{indexable: bool, robots: string, reasons: list<string>}
     */
    public static function assessListing(?Ad $ad): array
    {
        if (! $ad) {
            return self::result(false, ['missing_listing']);
        }

        $reasons = [];

        // Shared availability contract — never re-implement this predicate here, or the shell
        // and the ads sitemap drift apart again (the Aug 2026 empty sitemap-ads.xml regression).
        $isAvailable = ListingIndexability::isIndexable($ad);

        if ($ad->status !== 'active') {
            $reasons[] = 'not_active';
        }

        if ((bool) $ad->is_catalog_filler) {
            $reasons[] = 'catalog_filler';
        }

        if ($ad->expires_at === null) {
            $reasons[] = 'no_expiry';
        } elseif ($ad->expires_at->isPast()) {
            $reasons[] = 'expired';
        }

        $title = self::normalizeText(self::localized($ad->title));
        if (mb_strlen($title) < self::MIN_INDEXABLE_TITLE_LENGTH) {
            $reasons[] = 'thin_title';
        } elseif (preg_match(self::PLACEHOLDER_TITLE_PATTERN, Str::lower($title)) === 1) {
            $reasons[] = 'placeholder_title';
        }

        $description = self::normalizeText(self::localized($ad->description));
        if (mb_strlen($description) < self::MIN_INDEXABLE_DESCRIPTION_LENGTH) {
            $reasons[] = 'thin_description';
        }

        return self::result($isAvailable && $reasons === [], $reasons);
    }

    /**
     * A catalog page (`/` or `/listings`) is a filtered view when it carries
     * any query parameter that is not a known decoration.
     */
    public static function isFilteredResultsRequest(Request $request): bool
    {
        $path = '/' . trim($request->path(), '/');
        if ($path !== '/' && $path !== '/listings') {
            return false;
        }

        foreach (array_keys($request->query()) as $key) {
            if (! in_array(Str::lower((string) $key), self::IGNORED_RESULTS_QUERY_KEYS, true)) {
                return true;
            }
        }

        return false;
    }

    /** robots directive for a catalog page request. */
    public static function resultsRobots(Request $request): string
    {
        return self::isFilteredResultsRequest($request) ? self::ROBOTS_NOINDEX : self::ROBOTS_RESULTS_INDEXABLE;
    }

    /** robots directive for a listing detail page. */
    public static function listingRobots(?Ad $ad): string
    {
        return self::assessListing($ad)['robots'];
    }

    /**
     * @param  list<string>  $reasons
     * @return array{indexable: bool, robots: string, reasons: list<string>}
     */
    private static function result(bool $indexable, array $reasons): array
    {
        return [
            'indexable' => $indexable,
            'robots' => $indexable ? self::ROBOTS_INDEXABLE : self::ROBOTS_NOINDEX,
            'reasons' => array_values(array_unique($reasons)),
        ];
    }

    private static function normalizeText(?string $value): string
    {
        return trim((string) (preg_replace('/\s+/u', ' ', strip_tags((string) $value)) ?? ''));
    }

    /** Resolve a multilingual field (JSON string or plain string) to Spanish-first text. */
    private static function localized(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            return self::pickLocale($value);
        }

        $raw = (string) $value;
        $trimmed = trim($raw);

        if (str_starts_with($trimmed, '{')) {
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                return self::pickLocale($decoded);
            }
        }

        return $raw;
    }

    /** @param array<string, mixed> $map */
    private static function pickLocale(array $map): ?string
    {
        foreach (['es', 'en'] as $locale) {
            if (isset($map[$locale]) && is_string($map[$locale]) && trim($map[$locale]) !== '') {
                return $map[$locale];
            }
        }

        foreach ($map as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return $candidate;
            }
        }

        return null;
    }
}
