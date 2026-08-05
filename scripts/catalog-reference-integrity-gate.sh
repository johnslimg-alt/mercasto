#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Catalog reference integrity gate =="
grep -qF "if (ad.is_catalog_filler) return;" src/App.jsx
grep -qF "isCatalogFiller ? null : (node) => observeAdImpression" src/App.jsx
grep -qF "Precio de referencia" src/App.jsx
grep -qF "const genuineAds = useMemo" src/components/common/SplitViewContainer.jsx
grep -qF "referencia{catalogReferenceCount" src/components/common/SplitViewContainer.jsx
grep -qF -- "->where('is_catalog_filler', false)" backend/app/Http/Controllers/Api/ContactController.php
test "$(grep -cF -- "->where('is_catalog_filler', false)" backend/app/Http/Controllers/Api/AdController.php)" -ge 3
grep -qF "CatalogReferenceAnalyticsTest" backend/tests/Feature/CatalogReferenceAnalyticsTest.php
echo "catalog reference integrity gate OK"
