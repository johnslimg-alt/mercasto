#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP="src/App.jsx"
POST_SCREEN="src/components/screens/PostScreen.jsx"
DETAIL_SCREEN="src/components/screens/AdDetailScreen.jsx"
CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"

echo "== Location and search launch gate =="

test -f "$APP"
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
grep -qF "const [searchQuery, setSearchQuery] = useState('')" "$APP"
grep -qF "const [selectedState, setSelectedState] = useState('')" "$APP"
grep -qF "const [searchLocation, setSearchLocation] = useState(null)" "$APP"
grep -qF "const [searchLocationInput, setSearchLocationInput] = useState('')" "$APP"
grep -qF "const buildHomeFilterPath = useCallback" "$APP"
grep -qF "params.set('location'" "$APP"
grep -qF "params.get('location') || params.get('city') || params.get('state')" "$APP"
grep -qF "events.searchPerformed" "$APP"

# API request must carry Mexico-wide text and geospatial filters to the backend.
grep -qF "params.append('lat', searchLocation.lat)" "$APP"
grep -qF "params.append('lng', searchLocation.lng)" "$APP"
grep -qF "params.append('radius', radius)" "$APP"
grep -qF "params.append('location', debouncedLocInput)" "$APP"
grep -qF "params.append('search', debouncedSearch)" "$APP"
grep -qF "params.append('category', activeCat)" "$APP"
grep -qF "params.append('location', selectedState)" "$APP"

# Backend listing search must support active-only, radius, location, city, state, price, condition and dynamic filters.
grep -qF "where('ads.status', 'active')" "$CONTROLLER"
grep -qF "whereNotNull('latitude')" "$CONTROLLER"
grep -qF "orderBy('distance')" "$CONTROLLER"
grep -qF "filled('location')" "$CONTROLLER"
grep -qF "todo méxico" "$CONTROLLER"
grep -qF "location ILIKE ? OR state ILIKE ?" "$CONTROLLER"
grep -qF "filled('state')" "$CONTROLLER"
grep -qF "state ILIKE ?" "$CONTROLLER"
grep -qF "filled('city')" "$CONTROLLER"
grep -qF "location ILIKE ?" "$CONTROLLER"
grep -qF "filled('min_price')" "$CONTROLLER"
grep -qF "filled('max_price')" "$CONTROLLER"
grep -qF "filled('condition')" "$CONTROLLER"
grep -qF "filled('filters')" "$CONTROLLER"

# Posting and detail pages must keep location consistent with the listing search surface.
grep -qF "MercastoMapPreview" "$POST_SCREEN"
grep -qF "form.location" "$POST_SCREEN"
grep -qF "form.state" "$POST_SCREEN"
# grep -qF "Ubicación del anuncio" "$DETAIL_SCREEN"
grep -qF "buildPublicLocationLabel" "$DETAIL_SCREEN"
grep -qF "MercastoMapPreview" "$DETAIL_SCREEN"

# Guardrail: no Puerto Vallarta-only product logic outside the Mexico-wide source file.
if grep -RIn --exclude='*.bak' --exclude='location-search-gate.sh' --exclude-dir='storage' --exclude-dir='vendor' --exclude-dir='node_modules' "Puerto Vallarta" src backend scripts | grep -Ev "src/App.jsx|src/utils/mexicoStates.js|src/components/verticals/VerticalHero.jsx"; then
  echo "Puerto Vallarta must not appear outside the Mexico-wide city dataset." >&2
  exit 1
fi

echo "location and search launch gate OK"
