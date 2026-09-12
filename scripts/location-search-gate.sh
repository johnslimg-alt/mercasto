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
# and dynamic filters.
#
# This block used to assert 12 implementation literals against the controller and the filter class.
# They were removed in PR #1150: every semantic they pinned is now proved end to end against the
# routed endpoint (GET /ads -> AdIndexController@index -> AdQueryFilters::apply()), which is the only
# check that survives moving or re-expressing the SQL. The mapping from each deleted literal to the
# named test that would fail if its semantic regressed is a table in the PR body. Two of the twelve
# had NO behavioural coverage at all until tests were added for them
# (test_radius_results_are_ordered_nearest_first, test_todo_mexico_alias_does_not_narrow_by_location).
#
# This change DELIBERATELY REDUCES the number of assertions in this block while INCREASING
# behavioural coverage. That trade is only safe because the block below cannot be hollowed out: the
# invariant list is length-checked before use. See docs/architecture/gate-assertion-policy.md.
ROUTES="backend/routes/api.php"

# Wiring, where the text IS the deliverable: the public catalog must keep resolving to the routed
# controller whose behaviour the tests below exercise. If the route were re-pointed, the tests would
# still pass while the endpoint regressed.
if ! grep -qF "get('/ads', [AdIndexController::class, 'index'])" "$ROUTES"; then
  echo "The public catalog route no longer resolves to AdIndexController@index." >&2
  echo "The behavioural catalog tests below would then be exercising a different endpoint." >&2
  exit 1
fi

CATALOG_TEST="backend/tests/Feature/CatalogQueryInvariantsTest.php"

# Behavioural coverage is now the ONLY guarantee for these filter semantics.
if [ ! -s "$CATALOG_TEST" ]; then
  echo "Missing behavioural catalog test: $CATALOG_TEST" >&2
  echo "The public catalog filters must be proved against GET /ads, not inferred from source text." >&2
  exit 1
fi

catalog_invariants=(
  test_public_catalog_returns_only_active_listings
  test_price_range_filters_bound_the_returned_inventory
  test_condition_filter_returns_only_matching_listings
  test_city_filter_returns_only_listings_in_that_city
  test_state_filter_returns_only_listings_in_that_state
  test_location_filter_matches_the_combined_location_label
  test_todo_mexico_alias_does_not_narrow_by_location
  test_has_coords_filter_excludes_listings_without_coordinates
  test_radius_filter_drops_listings_outside_the_radius_and_without_coordinates
  test_radius_results_are_ordered_nearest_first
  test_attribute_filter_is_applied_through_the_json_attributes_column
  test_offset_pagination_has_a_stable_total_order
)

# Guard against this block becoming vacuous. With the implementation literals gone, a shrunken list
# would silently remove the only guarantee for those semantics, so shrinking it is a hard failure.
if [ "${#catalog_invariants[@]}" -lt 12 ]; then
  echo "Refusing to run: the behavioural catalog invariant list has ${#catalog_invariants[@]} entries, expected at least 12." >&2
  echo "Removing entries here deletes the only guarantee for those filter semantics." >&2
  exit 1
fi

for catalog_invariant in "${catalog_invariants[@]}"; do
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
