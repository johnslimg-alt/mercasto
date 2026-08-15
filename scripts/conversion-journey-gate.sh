#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Conversion journey contract gate =="
node --test \
  tests/protected-route-intent.test.mjs \
  tests/publish-draft.test.mjs \
  tests/saved-search-selection.test.mjs

grep -qF "contact_returned_after_auth" src/utils/protectedRouteReturn.js
grep -qF "data-testid=\"guest-contact-auth\"" src/components/screens/AdDetailScreen.jsx
grep -qF "navigate(messagePath)" src/components/screens/AdDetailScreen.jsx
grep -qF "writePublishDraft" src/components/screens/PostScreen.jsx
grep -qF "data-testid=\"publish-location-optional\"" src/components/screens/PostScreen.jsx
grep -qF "!!form.city" src/components/screens/PostScreen.jsx
grep -qF "clearPublishDraft();" src/App.jsx
grep -qF "listing_action_publish_submitted" src/App.jsx
grep -qF "navigate('/profile?tab=my_ads')" src/App.jsx
grep -qF "nullable|required_with:longitude|numeric|between:14,33" backend/app/Http/Controllers/Api/AdController.php
grep -qF "geocodeApproximateLocation(\$request->location, \$request->state)" backend/app/Http/Controllers/Api/AdController.php
grep -qF "source: 'saved_search'" src/components/screens/CatalogScreen.jsx

if grep -Eq 'onSearchSelect=\{\(filters\).*executeSearch\(\);' src/components/screens/CatalogScreen.jsx; then
  echo "saved searches must pass explicit filters instead of searching stale React state" >&2
  exit 1
fi

echo "conversion journey contract gate OK"
