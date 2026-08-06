#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FILTER_CONFIG="src/constants/filterConfig.js"
POST_SCREEN="src/components/screens/PostScreen.jsx"
DETAIL_SCREEN="src/components/screens/AdDetailScreen.jsx"
CONTROLLER="backend/app/Http/Controllers/Api/AdController.php"
QUERY_FILTERS="backend/app/Support/AdQueryFilters.php"
CATEGORY_CONFIG="backend/config/category_attributes.php"
CATEGORY_FILTER_TEST="backend/tests/Feature/CategoryFilterCompatibilityTest.php"
CATEGORY_FILTER_SMOKE="scripts/category-filter-smoke.sh"

echo "== Attribute flow launch gate =="

test -f "$FILTER_CONFIG"
test -f "$POST_SCREEN"
test -f "$DETAIL_SCREEN"
test -f "$CONTROLLER"
test -f "$QUERY_FILTERS"
test -f "$CATEGORY_CONFIG"
test -f "$CATEGORY_FILTER_TEST"
test -f "$CATEGORY_FILTER_SMOKE"

# Frontend category attribute source of truth.
grep -qF "export const filterConfig" "$FILTER_CONFIG"
grep -qF "const autoFilters" "$FILTER_CONFIG"
grep -qF "const propertyFilters" "$FILTER_CONFIG"
grep -qF "const jobFilters" "$FILTER_CONFIG"
grep -qF "const electronicsFilters" "$FILTER_CONFIG"
grep -qF "marca" "$FILTER_CONFIG"
grep -qF "modelo" "$FILTER_CONFIG"
grep -qF "year" "$FILTER_CONFIG"
grep -qF "m2" "$FILTER_CONFIG"
grep -qF "habitaciones" "$FILTER_CONFIG"
grep -qF "tipo_empleo" "$FILTER_CONFIG"
grep -qF "almacenamiento" "$FILTER_CONFIG"

# Publish/edit screens must render and submit dynamic attribute data.
grep -qF "filterConfig" "$POST_SCREEN"
grep -qF "category-attributes" "$POST_SCREEN"
grep -qF "form.attributes" "$POST_SCREEN"
grep -qF "form.attributes?.[" "$POST_SCREEN"
grep -qF "handleGenerateDescription" "$POST_SCREEN"

# Detail page must render saved attributes in a structured block.
grep -qF "filterConfig" "$DETAIL_SCREEN"
# grep -qF "Características principales" "$DETAIL_SCREEN"
grep -qF "Object.entries(attributes)" "$DETAIL_SCREEN"
grep -qF "fieldDef.label" "$DETAIL_SCREEN"

# Backend must validate, store, update and filter JSON attributes server-side.
grep -qF "'attributes' => 'nullable|array'" "$CONTROLLER"
grep -qF "filled('attributes')" "$CONTROLLER"
grep -qF "input('attributes')" "$CONTROLLER"
grep -qF "attributes" "$CONTROLLER"
grep -qF "filled('filters')" "$CONTROLLER"
grep -qF "attributes->{" "$CONTROLLER"
grep -qF "whereIn(" "$CONTROLLER"

# Public API filters must preserve current production category and legacy JSON-key compatibility.
grep -qF "'motor'" "$CATEGORY_CONFIG"
grep -qF "'inmobiliaria'" "$CATEGORY_CONFIG"
grep -qF "'empleo'" "$CATEGORY_CONFIG"
grep -qF "'storage_aliases' => ['km', 'kms']" "$CATEGORY_CONFIG"
grep -qF "'storage_aliases' => ['m2', 'area']" "$CATEGORY_CONFIG"
grep -qF "'storage_aliases' => ['salary']" "$CATEGORY_CONFIG"
grep -qF "configuredFilterMap" "$QUERY_FILTERS"
grep -qF "storageKeys" "$QUERY_FILTERS"
grep -qF "['range', 'number', 'integer', 'decimal']" "$QUERY_FILTERS"
grep -qF "test_motor_filters_match_canonical_and_legacy_storage_keys" "$CATEGORY_FILTER_TEST"
grep -qF "test_database_number_attribute_uses_range_semantics" "$CATEGORY_FILTER_TEST"
grep -qF "returned an empty result set" "$CATEGORY_FILTER_SMOKE"
grep -qF "category=motor" "$CATEGORY_FILTER_SMOKE"
grep -qF "category=inmobiliaria" "$CATEGORY_FILTER_SMOKE"
grep -qF "category=empleo" "$CATEGORY_FILTER_SMOKE"

echo "attribute flow launch gate OK"
