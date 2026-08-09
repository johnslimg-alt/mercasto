#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== Map shell localization contract gate =="

node --input-type=module <<'NODE'
import fs from 'fs';
const langs = ['es','en','pt','fr','zh','ko','de','it','ar','ru','ja'];
const keys = [
  'interactive','preview','filters','drawArea','closeMap','closeEsc','clearFilters',
  'realGps','approxCity','approxState','approxCityState','searchArea','realGpsOnly',
  'listingType','listingSale','listingRent','listingRentToOwn','listingTransfer',
  'listingFree','listingExchange','listingWanted','listingAuction','condition',
  'conditionNew','conditionLikeNew','conditionUsed','conditionRefurbished','conditionParts',
  'anyValue','youAreHere','label','listing','listings','viewListing','allMexico','locationTimeout',
];
let missing = [];
for (const lang of langs) {
  const json = JSON.parse(fs.readFileSync(`src/locales/${lang}.json`, 'utf8'));
  for (const key of keys) if (!json.map?.[key]) missing.push(`${lang}:map.${key}`);
}
if (missing.length) throw new Error(`Missing map translations: ${missing.join(', ')}`);
console.log(`map locale keys OK: ${keys.length} x ${langs.length}`);
NODE
MAP="src/components/common/MapV3.jsx"
SPLIT="src/components/common/SplitViewContainer.jsx"
CATALOG="src/components/screens/CatalogScreen.jsx"

grep -qF "localeFor(lang)" "$MAP"
grep -qF "localeFor(lang)" "$SPLIT"
grep -qF 'data-testid="map-filter-toggle"' "$MAP"
grep -qF 'data-testid="map-filter-listing-type"' "$MAP"
grep -qF 'data-testid={`map-condition-${opt}`}' "$MAP"
grep -qF 'data-testid="map-search-area"' "$MAP"
grep -qF 'lang={lang}' "$CATALOG"

if grep -Eq "toLocaleString\('es-MX'|>Mapa interactivo<|>Filtros<|>Cerca de mí<|>Dibujar área<|Tipo de anuncio</option>|Cualquier \$\{|btn\.textContent = 'Ver anuncio'|setLocationError\('[^']+'" "$MAP" "$SPLIT"; then
  echo "hardcoded map-shell localization regression detected" >&2
  exit 1
fi

echo "map shell localization contract gate OK"