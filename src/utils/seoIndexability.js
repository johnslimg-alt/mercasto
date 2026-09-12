/**
 * Canonical listing URLs and the crawler-indexability policy.
 *
 * This module is the single source of truth for two decisions that must be
 * identical in the server-rendered HTML (App\Support\SeoIndexability) and in
 * the hydrated React DOM:
 *
 *   1. where a listing actually lives (the only URL that may be emitted in
 *      structured data / canonical tags), and
 *   2. which listing pages search engines may index.
 *
 * Drift between the two renderings is what makes genuine listings invisible:
 * a schema URL pointing at a route that does not exist, or a page that is
 * `index,follow` in the initial HTML and `noindex,follow` after hydration.
 */
import { isCatalogReference } from './catalogInventory.js';

/**
 * Public listing route. nginx proxies `^/ads/[0-9]+/?$` to Laravel
 * (SeoShellController::ad), which is the only ad URL that is rendered with
 * listing metadata for crawlers, so it is the canonical listing path.
 *
 * `/anuncio/{id}` is an SPA-only alias: it is not proxied to Laravel, so a
 * crawler receives the generic app shell (homepage title + non-www canonical).
 */
export const LISTING_PATH_PREFIX = '/ads';

/** Fallback origin when there is no browser location (tests, SSR helpers). */
export const DEFAULT_SITE_ORIGIN = 'https://mercasto.com';

/** Build the path portion of a listing URL, e.g. `/ads/1234`. */
export const listingPath = (id) => `${LISTING_PATH_PREFIX}/${encodeURIComponent(String(id ?? '').trim())}`;

/**
 * Build an absolute listing URL.
 *
 * @param {string|number} id - Listing id
 * @param {string} [origin] - Origin to prefix; defaults to the current document
 *   origin so canonical/structured-data URLs always match the host the page was
 *   actually served from.
 */
export const listingUrl = (id, origin) => {
  const resolved = origin
    || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : DEFAULT_SITE_ORIGIN);
  return `${String(resolved).replace(/\/+$/, '')}${listingPath(id)}`;
};

/** robots directive for pages search engines may index. */
export const ROBOTS_INDEXABLE = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
/** Catalog/results pages have always shipped the shorter indexable directive. */
export const ROBOTS_RESULTS_INDEXABLE = 'index,follow,max-image-preview:large';
/** robots directive for pages that must be crawled but not indexed. */
export const ROBOTS_NOINDEX = 'noindex,follow,max-image-preview:large';
/** robots directive for private/authenticated routes. */
export const ROBOTS_PRIVATE = 'noindex,nofollow,noarchive';

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
export const MIN_INDEXABLE_DESCRIPTION_LENGTH = 10;

/** Kept identical to `SitemapController::ADS_MIN_TITLE_LENGTH`. */
export const MIN_INDEXABLE_TITLE_LENGTH = 3;

/**
 * Titles the content-quality audit and the ads sitemap already treat as legacy
 * placeholders (`legacy_placeholder_title`). They are never genuine listings.
 */
export const PLACEHOLDER_TITLE_PATTERN = /^(?:asdf|demo|lorem(?:\s+ipsum(?:\s+dolor\s+sit\s+amet)?)?|prueba|qwerty|test(?:ing)?|wrefrg|(?:test|testing|demo|prueba)[\s_-]*\d+)$/i;

/**
 * Query keys that only decorate a results page (tracking, detail overlays).
 * Anything else on `/` or `/listings` is treated as an active filter, which is
 * what makes a results page a thin, non-indexable view.
 */
export const RESULTS_PAGE_IGNORED_QUERY_KEYS = Object.freeze([
  'ad', 'store', 'lang', 'locale', 'ref', 'source', 'share',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'fbclid', 'gclid', 'msclkid', 'yclid', 'twclid', 'ttclid', 'mc_cid', 'mc_eid', '_gl',
]);

const normalizeText = (value) => String(value ?? '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Decide whether a listing is thin/placeholder content that must not be indexed.
 *
 * The thresholds and the placeholder-title list are kept identical to
 * `SitemapController` (`ADS_MIN_TITLE_LENGTH` / `ADS_MIN_DESCRIPTION_LENGTH` /
 * `ADS_PLACEHOLDER_TITLES`), so a listing the ads sitemap publishes can never be
 * thin on the page and vice versa.
 *
 * Catalog references are detected with the explicit-marker helper from
 * `utils/catalogInventory.js` rather than truthiness: an unexpected payload shape
 * must never de-index a real listing.
 *
 * @returns {{thin: boolean, reasons: string[]}}
 */
export const assessListingContent = (ad, lang = 'es') => {
  const reasons = [];

  if (!ad || typeof ad !== 'object') {
    return { thin: true, reasons: ['missing_listing'] };
  }

  if (isCatalogReference(ad)) reasons.push('catalog_filler');

  const title = normalizeText(localizedTitle(ad.title, lang));
  if (title.length < MIN_INDEXABLE_TITLE_LENGTH) reasons.push('thin_title');
  else if (PLACEHOLDER_TITLE_PATTERN.test(title.toLowerCase())) reasons.push('placeholder_title');

  const description = normalizeText(localizedTitle(ad.description, lang));
  if (description.length < MIN_INDEXABLE_DESCRIPTION_LENGTH) reasons.push('thin_description');

  return { thin: reasons.length > 0, reasons };
};

/**
 * Resolve the robots directive for a viewed listing.
 *
 * Mirrors `App\Support\SeoIndexability::assessListing()` exactly: the availability
 * contract shared with the ads sitemap (`App\Support\ListingIndexability` — not a
 * catalog reference, `status = active`, expiry set and in the future) plus the
 * thin-content gate. Expired, unpublished, reference and thin listings are
 * `noindex,follow`.
 *
 * @returns {{indexable: boolean, robots: string, reasons: string[]}}
 */
export const assessListingIndexability = (ad, { now = Date.now(), lang = 'es' } = {}) => {
  const reasons = [];

  if (!ad || typeof ad !== 'object') {
    return { indexable: false, robots: ROBOTS_NOINDEX, reasons: ['missing_listing'] };
  }

  if (ad.status !== 'active') reasons.push('not_active');

  const content = assessListingContent(ad, lang);
  reasons.push(...content.reasons);

  // Same availability rule as App\Support\ListingIndexability: a listing with no
  // expiry has no advertised lifetime, so the ads sitemap does not publish it and
  // the page must not claim an indexability the sitemap contradicts.
  const expiresAt = ad.expires_at ? new Date(ad.expires_at) : null;
  if (!expiresAt || !Number.isFinite(expiresAt.getTime())) reasons.push('no_expiry');
  else if (expiresAt.getTime() <= now) reasons.push('expired');

  const indexable = reasons.length === 0;

  return {
    indexable,
    robots: indexable ? ROBOTS_INDEXABLE : ROBOTS_NOINDEX,
    reasons,
  };
};

/**
 * A catalog/results page (`/` or `/listings`) is a filtered view when it
 * carries any query parameter that is not a known decoration. Filtered views
 * are `noindex,follow` so search engines consolidate them into the clean
 * landing page instead of indexing thousands of permutations.
 */
export const isFilteredResultsUrl = (pathname = '', search = '') => {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (path !== '/' && path !== '/listings') return false;

  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  for (const key of params.keys()) {
    if (!RESULTS_PAGE_IGNORED_QUERY_KEYS.includes(key.toLowerCase())) return true;
  }
  return false;
};

/** robots directive for a catalog/results page. Mirrors SeoIndexability::resultsRobots(). */
export const resultsPageRobots = (pathname = '', search = '') => (
  isFilteredResultsUrl(pathname, search) ? ROBOTS_NOINDEX : ROBOTS_RESULTS_INDEXABLE
);

// Kept local so this module stays importable from plain Node tests without
// pulling in browser-only helpers.
function localizedTitle(value, lang = 'es') {
  if (value == null) return '';
  if (typeof value === 'object' && !Array.isArray(value)) return pickLocale(value, lang);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return pickLocale(parsed, lang);
      } catch (error) {
        return value;
      }
    }
    return value;
  }
  return String(value);
}

function pickLocale(map, lang) {
  const direct = map[lang];
  if (typeof direct === 'string' && direct.trim()) return direct;
  if (typeof map.es === 'string' && map.es.trim()) return map.es;
  if (typeof map.en === 'string' && map.en.trim()) return map.en;
  const first = Object.values(map).find((candidate) => typeof candidate === 'string' && candidate.trim());
  return first || '';
}
