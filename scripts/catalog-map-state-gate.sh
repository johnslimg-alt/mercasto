#!/usr/bin/env bash
set -euo pipefail

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

if grep -qF '}, []);' "$APP" | grep -qF 'handleSearchArea'; then
  echo "Map area handler must depend on canonical filter state" >&2
  exit 1
fi

echo "catalog map state gate OK"
