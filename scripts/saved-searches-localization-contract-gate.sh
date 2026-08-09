#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCREEN="$ROOT/src/components/common/SavedSearchesPanel.jsx"
TRANSLATIONS="$ROOT/src/constants/translations"

echo "== Saved searches localization contract gate =="
for key in saved_searches_title load_failed update_alerts_failed delete_confirm delete_failed no_filters loading no_saved_searches no_saved_searches_desc tip deactivate_alerts activate_alerts delete_search; do
  for lang in es en pt fr zh ko de it ar ru ja; do
    grep -qF "${key}:" "$TRANSLATIONS/${lang}.js"
  done
done

grep -qF 'getTranslations(lang)' "$SCREEN"
grep -qF 'formatMXN' "$SCREEN"
grep -qF 'aria-label={search.is_active ? t.deactivate_alerts : t.activate_alerts}' "$SCREEN"
grep -qF 'aria-label={t.delete_search}' "$SCREEN"
if grep -qF 'const localTranslations' "$SCREEN"; then
  echo "Saved searches must use the shared runtime translation dictionary" >&2
  exit 1
fi

echo "saved searches localization contract gate OK"
