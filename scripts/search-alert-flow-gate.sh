#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PANEL="src/components/common/SavedSearchesPanel.jsx"
APP="src/App.jsx"
CONTROLLER="backend/app/Http/Controllers/Api/SearchAlertController.php"
DIGEST="backend/app/Jobs/SendWeeklyDigestJob.php"

echo "== Search alert return-flow gate =="

test -f "$PANEL"
test -f "$APP"
test -f "$CONTROLLER"
test -f "$DIGEST"

grep -qF '/user/search-alerts' "$PANEL"
grep -qF "is_active" "$PANEL"
grep -qF "mercasto:search-alert-saved" "$PANEL"
grep -qF "mercasto:search-alert-saved" "$APP"
grep -qF "DB::table('search_alerts')" "$DIGEST"
grep -qF "where('is_active', true)" "$DIGEST"

if grep -qF '/user/saved-searches' "$PANEL"; then
  echo "The active saved-search UI must not manage the legacy saved_searches store." >&2
  exit 1
fi

if grep -qE 'new_results_count|alerts_enabled|last_checked_at' "$PANEL"; then
  echo "The active saved-search UI still depends on the legacy saved_searches schema." >&2
  exit 1
fi

echo "search alert return-flow gate OK"
