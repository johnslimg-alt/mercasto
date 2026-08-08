#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASH="$ROOT/src/components/screens/UserDashboard.jsx"
STATS="$ROOT/src/components/screens/SellerStatsScreen.jsx"
MY_ADS="$ROOT/src/components/screens/MyAdsScreen.jsx"
FORMATTER="$ROOT/src/utils/localeFormat.js"
TRANSLATIONS="$ROOT/src/constants/translations"

echo "== Dashboard locale format contract gate =="
for key in trust_score avg_response_under_2h contact_history_device_desc contact_history_empty contacted_via; do
  for lang in es en pt fr zh ko de it ar he yi ru ja; do
    grep -qF "${key}:" "$TRANSLATIONS/${lang}.js"
  done
done
for token in formatDate formatMXN formatNumber; do
  grep -qF "$token" "$DASH"
done
grep -qF 'formatMXN' "$STATS"
grep -qF 'formatNumber' "$STATS"
grep -qF 'formatMXN' "$MY_ADS"
grep -qF 'formatNumber' "$MY_ADS"
grep -qF 'export function formatDate' "$FORMATTER"
grep -qF 'export function formatNumber' "$FORMATTER"

if grep -Eq "en-US|es-MX|pt-BR|ru-RU|toLocale(DateString|String)\\(" "$DASH" "$STATS" "$MY_ADS"; then
  echo "Dashboard surfaces must use the shared locale formatter" >&2
  exit 1
fi
if grep -Eq "\{t\.[A-Za-z0-9_]+\}" "$DASH" | grep -q "'"; then
  echo "Dashboard must not contain stringified translation expressions" >&2
  exit 1
fi
if grep -Eq 'Contactado vía|Trust Score|< 2 horas' "$DASH"; then
  echo "Dashboard must not contain fixed-language trust/contact copy" >&2
  exit 1
fi

echo "dashboard locale format contract gate OK"
