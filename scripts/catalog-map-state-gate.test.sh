#!/usr/bin/env bash
# Negative controls for scripts/catalog-map-state-gate.sh.
#
# The gate it replaces could never fail (a `grep -q | grep -q` pipeline inside
# `if` is always false), so these fixtures prove the hardening works: a broken
# map-area handler must make the gate exit non-zero, and the canonical tree must
# still pass.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-catalog-map-gate.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/scripts" "$TMP_DIR/src/components/screens" "$TMP_DIR/src/components/common"
cp "$ROOT_DIR/scripts/catalog-map-state-gate.sh" "$TMP_DIR/scripts/"

APP_FIXTURE="$TMP_DIR/src/App.jsx"

write_app_fixture() {
  local deps_line="$1"
  cat > "$APP_FIXTURE" <<APP
params.set('lat', String(nextGeo.lat))
params.set('lng', String(nextGeo.lng))
params.set('radius', String(nextRadius))
const hasGeoArea = true;
setSearchLocation({ lat: latParam, lng: lngParam })
const handleSearchArea = useCallback((area = {}) => {
  const nextQuery = area.query;
  navigate(nextQuery);
$deps_line
APP
}

cat > "$TMP_DIR/src/components/screens/CatalogScreen.jsx" <<'JSX'
initialFilters={mapInitialFilters}
category={activeCat}
JSX

cat > "$TMP_DIR/src/components/common/SplitViewContainer.jsx" <<'JSX'
initialFilters={initialFilters}
category={category}
JSX

cat > "$TMP_DIR/src/components/common/MapV3.jsx" <<'JSX'
if (propMarkers) {}
const mapQueryRef = useRef('');
const minPriceRef = useRef('');
const maxPriceRef = useRef('');
mapQueryRef.current = nextQuery;
minPriceRef.current = nextMinPrice;
maxPriceRef.current = nextMaxPrice;
query: mapQueryRef.current.trim()
minPrice: minPriceRef.current ? Number(minPriceRef.current) : null
maxPrice: maxPriceRef.current ? Number(maxPriceRef.current) : null
const lastMapAreaRef = React.useRef(null)
lastMapAreaRef.current = area
const mapArea = updateMapArea(activeMapInstance()) || lastMapAreaRef.current
const handleExpandMap = () => {}
updateMapArea(mapInstanceRef.current)
setDynamicFilters(initialFilters.dynamic)
category: selectedCategory
data-testid="map-search-area"
data-testid="map-filter-toggle"
JSX

cat > "$TMP_DIR/scripts/static-safety-scans.sh" <<'SH'
node --test scripts/catalog-map-contract.test.mjs
node --test tests/map-marker-filters.test.mjs
node --test tests/filter-url-state.test.mjs
SH

run_gate() {
  set +e
  gate_output="$(bash "$TMP_DIR/scripts/catalog-map-state-gate.sh" 2>&1)"
  gate_status=$?
  set -e
}

expect_failure() {
  local label="$1" expected="$2"
  run_gate
  if (( gate_status == 0 )); then
    echo "catalog map gate accepted a broken tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
  if ! grep -qF "$expected" <<<"$gate_output"; then
    echo "catalog map gate failed for the wrong reason: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

expect_nonzero() {
  local label="$1"
  run_gate
  if (( gate_status == 0 )); then
    echo "catalog map gate accepted a broken tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

# 1. Healthy handler with a complete dependency array passes.
write_app_fixture '  }, [activeCat, buildHomeFilterPath, conditionFilter, dynamicFilters, maxPrice, minPrice, navigate, radius, searchLocationInput, searchQuery, selectedState]);'
run_gate
if (( gate_status != 0 )); then
  echo 'catalog map gate rejected the healthy fixture' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'catalog map state gate OK' <<<"$gate_output"

# 2. The exact defect the old gate could not see: empty dependency array.
write_app_fixture '  }, []);'
expect_failure 'handleSearchArea memoized with []' 'empty dependency array'

# 3. Handler removed entirely (fails the wiring assertion first, and would fail
#    the extraction guard as well).
write_app_fixture '  }, [activeCat, conditionFilter, dynamicFilters, maxPrice, minPrice, radius, searchQuery, selectedState]);'
sed -i '/const handleSearchArea = useCallback/d' "$APP_FIXTURE"
expect_nonzero 'handleSearchArea deleted'

# 4. Canonical filter state dropped from the dependency array.
write_app_fixture '  }, [conditionFilter, dynamicFilters, maxPrice, minPrice, navigate, radius, searchQuery, selectedState]);'
expect_failure 'activeCat dropped from dependencies' "omits canonical filter state 'activeCat'"

# 5. Map behaviour tests unwired from the executed static-safety chain.
write_app_fixture '  }, [activeCat, buildHomeFilterPath, conditionFilter, dynamicFilters, maxPrice, minPrice, navigate, radius, searchLocationInput, searchQuery, selectedState]);'
sed -i '/map-marker-filters/d' "$TMP_DIR/scripts/static-safety-scans.sh"
expect_failure 'map behaviour tests unwired' 'no longer executed by scripts/static-safety-scans.sh'

echo 'catalog map state gate regression test OK'
