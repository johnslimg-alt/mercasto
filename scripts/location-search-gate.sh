#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP="src/App.jsx"
SEARCH_STATE="src/app/useSearchSuggestionState.js"
LOCATION_STATE="src/app/useLocationSearchState.js"
CATALOG_STATE="src/app/useCatalogState.js"
POST_SCREEN="src/components/screens/PostScreen.jsx"
DETAIL_SCREEN="src/components/screens/AdDetailScreen.jsx"
CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"

echo "== Location and search launch gate =="

test -f "$APP"
test -f "$SEARCH_STATE"
test -f "$LOCATION_STATE"
test -f "$CATALOG_STATE"
test -f "$POST_SCREEN"
test -f "$DETAIL_SCREEN"
test -f "$CONTROLLER"

# Mexico-wide location data must exist in the public UI, not a one-city launch stub.
grep -qF "const MEXICO_STATES_CITIES =" "$APP"
grep -qF '"Ciudad de México"' "$APP"
grep -qF '"Jalisco"' "$APP"
grep -qF '"Guadalajara"' "$APP"
grep -qF '"Puerto Vallarta"' "$APP"
grep -qF '"Nuevo León"' "$APP"
grep -qF '"Monterrey"' "$APP"
grep -qF '"Veracruz"' "$APP"
grep -qF '"Boca del Río"' "$APP"
grep -qF '"Yucatán"' "$APP"
grep -qF '"Mérida"' "$APP"

# Search/filter state must be shareable and not limited to a local hardcoded city.
grep -qF "const [searchQuery, setSearchQuery] = useState('')" "$SEARCH_STATE"
grep -qF "useSearchSuggestionState()" "$APP"
grep -qF "const [selectedState, setSelectedState] = useState('')" "$CATALOG_STATE"
grep -qF "useCatalogState()" "$APP"
grep -qF "const [searchLocation, setSearchLocation] = useState(null)" "$LOCATION_STATE"
grep -qF "const [searchLocationInput, setSearchLocationInput] = useState('')" "$LOCATION_STATE"
grep -qF "useLocationSearchState()" "$APP"
grep -qF "const buildHomeFilterPath = useCallback" "$APP"
grep -qF "params.set('location'" "$APP"
grep -qF "params.get('location') || cityParam || stateParam" "$APP"
grep -qF "events.searchPerformed" "$APP"

# API request must carry Mexico-wide text and geospatial filters to the backend.
grep -qF "params.append('lat', searchLocation.lat)" "$APP"
grep -qF "params.append('lng', searchLocation.lng)" "$APP"
grep -qF "params.append('radius', radius)" "$APP"
grep -qF "params.append('location', debouncedLocInput)" "$APP"
grep -qF "params.append('search', debouncedSearch)" "$APP"
grep -qF "params.append('category', activeCat)" "$APP"
grep -qF "params.append('location', selectedState)" "$APP"

# Backend listing search must support active-only, radius, location, city, state, price, condition
# and dynamic filters. These literals are asserted in the ROUTED catalog query path:
#   routes/api.php GET /ads -> AdIndexController@index -> AdQueryFilters::apply()
# They used to be asserted in Api/AdController.php, whose index() method is unreachable (no route,
# no call site). That dead copy kept the gate green while the live filters could break unnoticed,
# and the live path had long been re-implemented in a different dialect (LOWER(...) LIKE LOWER(?)
# instead of the Postgres ILIKE pinned here). scripts/gate-integrity-check.mjs now fails CI if any
# gate pins controller code that nothing can reach again.
CATALOG="backend/app/Http/Controllers/Api/AdIndexController.php"
FILTERS="backend/app/Support/AdQueryFilters.php"
CATALOG_TEST="backend/tests/Feature/CatalogQueryInvariantsTest.php"
grep -qF "where('ads.status', 'active')" "$CATALOG"
grep -qF "whereNotNull('latitude')" "$CATALOG"
grep -qF "orderBy('distance')" "$CATALOG"
grep -qF "filled('location')" "$CATALOG"
grep -qF "todo méxico" "$CATALOG"
grep -qF "filled('state')" "$CATALOG"
grep -qF "filled('city')" "$CATALOG"
grep -qF "filled('condition')" "$CATALOG"
grep -qF "LOWER(state) LIKE LOWER(?)" "$FILTERS"
grep -qF "LOWER(location) LIKE LOWER(?)" "$FILTERS"
grep -qF "filled('filters')" "$FILTERS"
grep -qF "price_max" "$FILTERS"

# The behaviour those literals describe is proved end to end against the routed endpoint, so the
# guarantee no longer depends on where the SQL text lives or which dialect it uses.
if [ ! -s "$CATALOG_TEST" ]; then
  echo "Missing behavioural catalog test: $CATALOG_TEST" >&2
  echo "The public catalog filters must be proved against GET /ads, not inferred from source text." >&2
  exit 1
fi
for catalog_invariant in \
  test_public_catalog_returns_only_active_listings \
  test_price_range_filters_bound_the_returned_inventory \
  test_condition_filter_returns_only_matching_listings \
  test_city_filter_returns_only_listings_in_that_city \
  test_state_filter_returns_only_listings_in_that_state \
  test_location_filter_matches_the_combined_location_label \
  test_has_coords_filter_excludes_listings_without_coordinates \
  test_radius_filter_drops_listings_outside_the_radius_and_without_coordinates \
  test_attribute_filter_is_applied_through_the_json_attributes_column \
  test_offset_pagination_has_a_stable_total_order
do
  if ! grep -qF "$catalog_invariant" "$CATALOG_TEST"; then
    echo "Behavioral catalog invariant missing from $CATALOG_TEST: $catalog_invariant" >&2
    exit 1
  fi
done

# Posting and detail pages must keep location consistent with the listing search surface.
grep -qF "MapV3" "$POST_SCREEN"
grep -qF "form.location" "$POST_SCREEN"
grep -qF "form.state" "$POST_SCREEN"
# grep -qF "Ubicación del anuncio" "$DETAIL_SCREEN"
grep -qF "buildPublicLocationLabel" "$DETAIL_SCREEN"
grep -qF "MapV3" "$DETAIL_SCREEN"

# Guardrail: no Puerto Vallarta-only product logic outside the Mexico-wide source files.
if grep -RIn --exclude='*.bak' --exclude='location-search-gate.sh' --exclude-dir='storage' --exclude-dir='vendor' --exclude-dir='node_modules' "Puerto Vallarta" src backend scripts | grep -Ev "src/App.jsx|src/constants/locationsAndCategories.js|src/utils/mexicoStates.js|src/components/verticals/VerticalHero.jsx"; then
  echo "Puerto Vallarta must not appear outside the Mexico-wide city dataset." >&2
  exit 1
fi

echo "location and search launch gate OK"
