#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP="src/App.jsx"
CATALOG="src/components/screens/CatalogScreen.jsx"
SPLIT="src/components/common/SplitViewContainer.jsx"
MAP="src/components/common/MapV3.jsx"

echo "== Catalog map state gate =="

grep -qF "params.set('lat', String(nextGeo.lat))" "$APP"
grep -qF "params.set('lng', String(nextGeo.lng))" "$APP"
grep -qF "params.set('radius', String(nextRadius))" "$APP"
grep -qF "const hasGeoArea" "$APP"
grep -qF "setSearchLocation({ lat: latParam, lng: lngParam })" "$APP"
grep -qF "const handleSearchArea = useCallback((area = {})" "$APP"
grep -qF "initialFilters={mapInitialFilters}" "$CATALOG"
grep -qF "category={activeCat}" "$CATALOG"
grep -qF "initialFilters={initialFilters}" "$SPLIT"
grep -qF "category={category}" "$SPLIT"
grep -qF "if (propMarkers)" "$MAP"
grep -qF "const mapQueryRef = useRef('')" "$MAP"
grep -qF "const minPriceRef = useRef('')" "$MAP"
grep -qF "const maxPriceRef = useRef('')" "$MAP"
grep -qF "mapQueryRef.current = nextQuery" "$MAP"
grep -qF "minPriceRef.current = nextMinPrice" "$MAP"
grep -qF "maxPriceRef.current = nextMaxPrice" "$MAP"
grep -qF "query: mapQueryRef.current.trim()" "$MAP"
grep -qF "minPrice: minPriceRef.current ? Number(minPriceRef.current) : null" "$MAP"
grep -qF "maxPrice: maxPriceRef.current ? Number(maxPriceRef.current) : null" "$MAP"
grep -qF "const lastMapAreaRef = React.useRef(null)" "$MAP"
grep -qF "lastMapAreaRef.current = area" "$MAP"
grep -qF "const mapArea = updateMapArea(activeMapInstance()) || lastMapAreaRef.current" "$MAP"
grep -qF "const handleExpandMap = () =>" "$MAP"
grep -qF "updateMapArea(mapInstanceRef.current)" "$MAP"
grep -qF "setDynamicFilters(initialFilters.dynamic" "$MAP"
grep -qF "category: selectedCategory" "$MAP"
grep -qF 'data-testid="map-search-area"' "$MAP"
grep -qF 'data-testid="map-filter-toggle"' "$MAP"

# ---------------------------------------------------------------------------
# Map area handler must depend on canonical filter state.
#
# This check used to be:
#     if grep -qF '}, []);' "$APP" | grep -qF 'handleSearchArea'; then
# which could never fire. `grep -q` writes no stdout, so the right-hand grep
# always read an empty stdin and exited 1; the pipeline status (the only status
# an `if` sees) was therefore always 1 and the failure branch was unreachable.
# The gate could not fail, so its status carried no information.
#
# The replacement extracts the real handleSearchArea useCallback body from
# App.jsx and inspects the dependency array that closes it, so:
#   * deleting the handler            -> FAIL (no block extracted)
#   * memoizing it with `}, []);`      -> FAIL (empty dependency array)
#   * dropping a canonical filter dep  -> FAIL (stale-closure bug returns)
# ---------------------------------------------------------------------------
REQUIRED_HANDLER_DEPS=(activeCat searchQuery minPrice maxPrice conditionFilter dynamicFilters selectedState radius)

HANDLER_BLOCK="$(awk '
  /const handleSearchArea = useCallback\(\(area = \{\}\)/ { inside = 1 }
  inside { print }
  inside && /^  \}, \[/ { exit }
' "$APP")"

if [ -z "$HANDLER_BLOCK" ]; then
  echo "FAIL: could not locate the handleSearchArea useCallback in $APP" >&2
  echo "      the map-area handler is the only thing that persists map state into the catalog URL" >&2
  exit 1
fi

HANDLER_DEPS="$(printf '%s\n' "$HANDLER_BLOCK" | tail -n 1)"
case "$HANDLER_DEPS" in
  *'[]);'*)
    echo 'FAIL: handleSearchArea is memoized with an empty dependency array' >&2
    echo "      it would close over stale filter state: $HANDLER_DEPS" >&2
    exit 1
    ;;
esac

for dep in "${REQUIRED_HANDLER_DEPS[@]}"; do
  if ! grep -qE "(^|[^A-Za-z0-9_])${dep}([^A-Za-z0-9_]|$)" <<<"$HANDLER_DEPS"; then
    echo "FAIL: handleSearchArea dependency array omits canonical filter state '$dep'" >&2
    echo "      deps: $HANDLER_DEPS" >&2
    exit 1
  fi
done

# The static wiring above is only meaningful while the behavioural map/filter
# tests actually run somewhere. They are wired into scripts/static-safety-scans.sh,
# which npm run check:static-safety executes in CI; if that wiring is removed the
# map contract silently loses its only executed coverage.
for wired in \
  'node --test scripts/catalog-map-contract.test.mjs' \
  'node --test tests/map-marker-filters.test.mjs' \
  'node --test tests/filter-url-state.test.mjs'
do
  if ! grep -qF "$wired" scripts/static-safety-scans.sh; then
    echo "FAIL: map behaviour test is no longer executed by scripts/static-safety-scans.sh" >&2
    echo "      missing wiring: $wired" >&2
    exit 1
  fi
done

echo "catalog map state gate OK"
