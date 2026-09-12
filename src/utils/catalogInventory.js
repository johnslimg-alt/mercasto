/**
 * Explicit catalog-reference marker for listing payloads.
 *
 * Catalog references (`is_catalog_filler`) are editorial placeholders, not seller
 * inventory: AdCard skips impression tracking for them by design and renders a
 * "Referencia de catálogo Mercasto" badge instead of the seller call to action.
 *
 * Because skipping tracking is a destructive action against real listings, the check
 * is strict: only an explicit placeholder marker counts. Missing, null, `false`, `0`,
 * `'0'`, `''` or `'false'` values are treated as real inventory, so a real ad can
 * never silently lose impressions/views/SEO indexing because of an unexpected
 * payload shape. The backend keeps emitting a real boolean
 * (see backend/tests/Feature/CatalogRealInventoryRankingTest.php).
 */
const CATALOG_REFERENCE_MARKERS = new Set([true, 1, '1', 'true']);

export function isCatalogReference(ad) {
  return CATALOG_REFERENCE_MARKERS.has(ad?.is_catalog_filler);
}
