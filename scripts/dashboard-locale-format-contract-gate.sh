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
  for lang in es en pt fr zh ko de it ar ru ja; do
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
# NOTE: this must be a SINGLE grep, not a pipeline. Two defects were found here by
# scripts/gate-integrity-check.mjs:
#   1. `grep -Eq ... | grep -q "'"` -- the left `-q` writes nothing to stdout, so
#      the stream was always empty and the guard could never fire (RC-4 /
#      retrospective-2 case 5).
#   2. Repairing that to `grep -E ... | grep -q "'"` was still not enough under
#      `set -o pipefail`, which this script sets. The downstream `grep -q` exits on
#      its first match, the upstream grep takes SIGPIPE and returns 141, and
#      pipefail makes the pipeline non-zero -- so the guard was skipped exactly
#      when the file was large enough to keep the pipe busy. Measured on a 20,001
#      line control with a quote on line 1 and 20,000 matching lines after:
#      pipeline rc=141 under pipefail, rc=0 without. The guard missed a real match.
#
# One grep matching "a {t.x} expression AND a quote on the same line", in either
# order, has no pipeline and therefore no SIGPIPE. Verified: it fires on that
# control and still does not fire on the current sources.
if grep -Eq "(\{t\.[A-Za-z0-9_]+\}[^']*')|('[^']*\{t\.[A-Za-z0-9_]+\})" "$DASH"; then
  echo "Dashboard must not contain stringified translation expressions" >&2
  exit 1
fi
if grep -Eq 'Contactado vía|Trust Score|< 2 horas' "$DASH"; then
  echo "Dashboard must not contain fixed-language trust/contact copy" >&2
  exit 1
fi

echo "dashboard locale format contract gate OK"
