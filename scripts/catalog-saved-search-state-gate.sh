#!/usr/bin/env bash
set -euo pipefail

UTILITY="src/utils/savedSearchSelection.js"
CATALOG="src/components/screens/CatalogScreen.jsx"
APP="src/App.jsx"
SIDEBAR="src/components/common/SidebarFilters.jsx"

echo "== Catalog saved-search state gate =="

grep -qF "condition: cleanList(conditionSource)" "$UTILITY"
grep -qF "dynamicFilters," "$UTILITY"
grep -qF "setConditionFilter(condition)" "$CATALOG"
grep -qF "setDynamicFilters(nextDynamicFilters)" "$CATALOG"
grep -qF "condition," "$CATALOG"
grep -qF "dynamicFilters: nextDynamicFilters" "$CATALOG"
grep -qF "const searchAlertFilters = { ...(dynamicFilters || {}) };" "$APP"
grep -qF "searchAlertFilters.condition = [...conditionFilter]" "$APP"
grep -qF "filters: searchAlertFilters" "$APP"
grep -qF 'sidebar-filter-condition-${cond}' "$SIDEBAR"
grep -qF 'data-testid="catalog-save-search"' "$CATALOG"

if grep -qF "filters: dynamicFilters || {}" "$APP"; then
  echo "Search alerts must include condition with dynamic filters" >&2
  exit 1
fi

node --test tests/saved-search-selection.test.mjs

echo "catalog saved-search state gate OK"
