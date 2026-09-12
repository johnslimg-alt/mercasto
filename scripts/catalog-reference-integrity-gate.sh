#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Catalog reference integrity gate =="
# Catalog-reference handling must key on the explicit marker helper: a real listing
# can never lose view/impression tracking to an unexpected payload shape.
grep -qF "if (isCatalogReference(ad)) return;" src/App.jsx
grep -qF "import { isCatalogReference } from './utils/catalogInventory';" src/App.jsx
if grep -qF "if (ad.is_catalog_filler) return;" src/App.jsx; then
  echo "view tracking must use the explicit reference marker instead of truthiness" >&2
  exit 1
fi
grep -qF "const CATALOG_REFERENCE_MARKERS = new Set([true, 1, '1', 'true']);" src/utils/catalogInventory.js
grep -qF "const isCatalogFiller = isCatalogReference(ad);" src/components/common/AdCard.jsx
grep -qF "ref={isCatalogFiller ? null : observeRef}" src/components/common/AdCard.jsx
grep -qF "observeAdImpression?.(node, ad.id);" src/components/common/AdCard.jsx
grep -qF "detailCopy.catalogTitle" src/components/common/AdCard.jsx
grep -qF "const genuineAds = useMemo" src/components/common/SplitViewContainer.jsx
grep -qF "t.map_catalog_references" src/components/common/SplitViewContainer.jsx
grep -qF -- "->where('is_catalog_filler', false)" backend/app/Http/Controllers/Api/ContactController.php
test "$(grep -cF -- "->where('is_catalog_filler', false)" backend/app/Http/Controllers/Api/AdController.php)" -ge 3
grep -qF "CatalogReferenceAnalyticsTest" backend/tests/Feature/CatalogReferenceAnalyticsTest.php
echo "catalog reference integrity gate OK"
