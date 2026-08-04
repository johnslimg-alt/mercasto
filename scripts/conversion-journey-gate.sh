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
grep -qF "data-testid=\"publish-location-required\"" src/components/screens/PostScreen.jsx
grep -qF "if (!isUpdating) clearPublishDraft();" src/App.jsx
grep -qF "source: 'saved_search'" src/components/screens/HomeScreen.jsx

if grep -Eq 'onSearchSelect=\{\(filters\).*executeSearch\(\);' src/components/screens/HomeScreen.jsx; then
  echo "saved searches must pass explicit filters instead of searching stale React state" >&2
  exit 1
fi

echo "conversion journey contract gate OK"
