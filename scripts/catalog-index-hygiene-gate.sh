#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SITEMAP="backend/app/Http/Controllers/Api/SitemapController.php"
SITEMAP_SUPPORT="backend/app/Support/ListingIndexability.php"
ROUTES="backend/routes/web.php"
NGINX="default.conf"
SITEMAP_JOB="scripts/update-sitemaps.sh"
SERVER="backend/app/Http/Controllers/SeoShellController.php"
APP="src/App.jsx"
SERVER_TEST="backend/tests/Feature/SeoShellControllerTest.php"
SITEMAP_TEST="backend/tests/Feature/SitemapIndexHygieneTest.php"

echo "== Catalog index hygiene gate =="

grep -qF -- "Cache::remember('sitemap_ads_v4'" "$SITEMAP"
# The indexability predicate lives in exactly one place so the sitemap and the SEO shell cannot
# drift apart (their hand-copied filters emptied /sitemap-ads.xml in Aug 2026).
grep -qF -- "->where('ads.is_catalog_filler', false)" "$SITEMAP_SUPPORT"
grep -qF -- "->where('ads.status', 'active')" "$SITEMAP_SUPPORT"
grep -qF -- "->whereNotNull('ads.expires_at')" "$SITEMAP_SUPPORT"
grep -qF -- "->where('ads.expires_at', '>', \$now)" "$SITEMAP_SUPPORT"
grep -qF -- 'ListingIndexability::apply(' "$SITEMAP"
grep -qF -- 'ListingIndexability::isIndexable(' "$SERVER"
grep -qF -- 'function isIndexable(Ad $ad' "$SITEMAP_SUPPORT"
if grep -qF -- "whereIn('status', ['approved', 'active'])" "$SITEMAP"; then
  echo "approved listings must not enter the ad sitemap" >&2
  exit 1
fi
if grep -qF -- 'limit(10000)' "$SITEMAP"; then
  echo "ads sitemap must be chunked, not truncated at an arbitrary limit" >&2
  exit 1
fi
# A silent empty ads sitemap must be impossible: zero URLs with real inventory is loud.
grep -qF -- "Log::error('ads_sitemap.visible_inventory_not_indexable'" "$SITEMAP"
grep -qF -- "Log::critical('ads_sitemap.eligible_inventory_not_published'" "$SITEMAP"
grep -qF -- "Log::warning('ads_sitemap.no_visible_inventory'" "$SITEMAP"
grep -qF -- "header('Retry-After', '900')" "$SITEMAP"
# Chunking: 50,000-URL / 50 MB per-file limits, advertised directly by the sitemap index.
grep -qF -- 'ADS_URLS_PER_CHUNK = 45000' "$SITEMAP"
grep -qF -- "Route::get('/sitemap-ads-{chunk}.xml'" "$ROUTES"
grep -qF -- 'ads(?:-\d+)?' "$NGINX"
# The cron entry that used to fail with "not found" must keep its target in the repository.
test -x "$SITEMAP_JOB"
grep -qF -- 'X-Mercasto-Sitemap-Health' "$SITEMAP_JOB"
grep -qF -- '$isCatalogFiller = (bool) $ad->is_catalog_filler;' "$SERVER"
grep -qF -- '$isCurrentlyAvailable = $ad->expires_at && $ad->expires_at->isFuture();' "$SERVER"
grep -qF -- "'robots' => 'noindex,follow,max-image-preview:large'" "$SERVER"
grep -qF -- "'@type' => 'WebPage'" "$SERVER"
grep -qF -- "'availability' => 'https://schema.org/InStock'" "$SERVER"

grep -qF -- 'const isViewedCatalogFiller = isCatalogReference(viewedAd);' "$APP"
# A listing is a catalog reference only on an explicit marker, so an unexpected
# payload shape can never de-index a real listing (see utils/catalogInventory.js).
grep -qF -- "import { isCatalogReference } from './utils/catalogInventory';" "$APP"
grep -qF -- "const CATALOG_REFERENCE_MARKERS = new Set([true, 1, '1', 'true']);" src/utils/catalogInventory.js
if grep -qF -- 'Boolean(viewedAd?.is_catalog_filler)' "$APP"; then
  echo "catalog indexability must use the explicit reference marker instead of truthiness" >&2
  exit 1
fi
grep -qF -- 'const isViewedListingIndexable = Boolean(' "$APP"
grep -qF -- '(viewedAd && !isViewedListingIndexable)' "$APP"
grep -qF -- 'if (viewedAd && isViewedListingIndexable)' "$APP"
grep -qF -- 'ogType = isViewedListingIndexable ? "product" : "website";' "$APP"

grep -qF -- 'test_catalog_reference_is_noindex_and_never_claims_product_availability' "$SERVER_TEST"
grep -qF -- 'test_expired_active_listing_is_noindex_and_not_in_stock' "$SERVER_TEST"
grep -qF -- 'test_ad_sitemap_contains_only_genuine_active_unexpired_listings' "$SITEMAP_TEST"
grep -qF -- 'test_ad_sitemap_never_lists_catalog_fillers_even_with_a_future_expiry' "$SITEMAP_TEST"
grep -qF -- 'test_ad_sitemap_fails_loudly_when_visible_real_listings_are_not_indexable' "$SITEMAP_TEST"
grep -qF -- 'test_ad_sitemap_warns_but_stays_valid_when_no_listing_is_visible' "$SITEMAP_TEST"
grep -qF -- 'test_ad_sitemap_chunks_inventory_and_the_index_advertises_every_chunk' "$SITEMAP_TEST"
grep -qF -- 'test_ad_sitemap_excludes_thin_placeholder_and_duplicated_listings' "$SITEMAP_TEST"

echo "Catalog index hygiene gate OK"
