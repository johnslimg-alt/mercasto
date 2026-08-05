#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SITEMAP="backend/app/Http/Controllers/Api/SitemapController.php"
SERVER="backend/app/Http/Controllers/SeoShellController.php"
APP="src/App.jsx"
SERVER_TEST="backend/tests/Feature/SeoShellControllerTest.php"
SITEMAP_TEST="backend/tests/Feature/SitemapIndexHygieneTest.php"

echo "== Catalog index hygiene gate =="

grep -qF -- "Cache::remember('sitemap_ads_v4'" "$SITEMAP"
grep -qF -- "->where('is_catalog_filler', false)" "$SITEMAP"
grep -qF -- "->where('status', 'active')" "$SITEMAP"
grep -qF -- "->whereNotNull('expires_at')" "$SITEMAP"
grep -qF -- "->where('expires_at', '>', now())" "$SITEMAP"
if grep -qF -- "whereIn('status', ['approved', 'active'])" "$SITEMAP"; then
  echo "approved listings must not enter the ad sitemap" >&2
  exit 1
fi
grep -qF -- '$isCatalogFiller = (bool) $ad->is_catalog_filler;' "$SERVER"
grep -qF -- '$isCurrentlyAvailable = $ad->expires_at && $ad->expires_at->isFuture();' "$SERVER"
grep -qF -- "'robots' => 'noindex,follow,max-image-preview:large'" "$SERVER"
grep -qF -- "'@type' => 'WebPage'" "$SERVER"
grep -qF -- "'availability' => 'https://schema.org/InStock'" "$SERVER"

grep -qF -- 'const isViewedCatalogFiller = Boolean(viewedAd?.is_catalog_filler);' "$APP"
grep -qF -- 'const isViewedListingIndexable = Boolean(' "$APP"
grep -qF -- '(viewedAd && !isViewedListingIndexable)' "$APP"
grep -qF -- 'if (viewedAd && isViewedListingIndexable)' "$APP"
grep -qF -- 'ogType = isViewedListingIndexable ? "product" : "website";' "$APP"

grep -qF -- 'test_catalog_reference_is_noindex_and_never_claims_product_availability' "$SERVER_TEST"
grep -qF -- 'test_expired_active_listing_is_noindex_and_not_in_stock' "$SERVER_TEST"
grep -qF -- 'test_ad_sitemap_contains_only_genuine_active_unexpired_listings' "$SITEMAP_TEST"

echo "Catalog index hygiene gate OK"
