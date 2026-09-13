#!/usr/bin/env bash
set -euo pipefail

# Negative control for scripts/dashboard-locale-format-contract-gate.sh.
#
# Two defects were found in this gate's stringified-translation guard, so the
# control covers both shapes:
#   1. `grep -q` on the left of a pipe writes no stdout, so the guard could never
#      fire at all;
#   2. with `set -o pipefail`, the surviving pipeline still failed with SIGPIPE
#      (141) when the downstream `grep -q` exited early on a large input, so the
#      guard was skipped precisely when it had something to find.
#
# Everything runs in a temporary directory; the repository is never modified.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE="scripts/dashboard-locale-format-contract-gate.sh"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

seed() {
  rm -rf "$TMP/tree"
  mkdir -p "$TMP/tree/scripts" "$TMP/tree/src/components/screens" "$TMP/tree/src/utils" "$TMP/tree/src/constants"
  cp -r "$ROOT/src/constants/translations" "$TMP/tree/src/constants/translations"
  cp "$ROOT/src/utils/localeFormat.js" "$TMP/tree/src/utils/localeFormat.js"
  cp "$ROOT/src/components/screens/SellerStatsScreen.jsx" "$TMP/tree/src/components/screens/SellerStatsScreen.jsx"
  cp "$ROOT/src/components/screens/MyAdsScreen.jsx" "$TMP/tree/src/components/screens/MyAdsScreen.jsx"
  cp "$ROOT/src/components/screens/UserDashboard.jsx" "$TMP/tree/src/components/screens/UserDashboard.jsx"
  cp "$ROOT/$GATE" "$TMP/tree/$GATE"
}

run_gate() {
  bash "$TMP/tree/$GATE" 2>&1
}

check() {
  local label="$1" expected_rc="$2"
  local out rc=0
  out="$(run_gate)" || rc=$?
  if [ "$rc" -ne "$expected_rc" ]; then
    echo "FAIL[$label]: expected rc=$expected_rc, got rc=$rc" >&2
    printf '%s\n' "$out" >&2
    exit 1
  fi
  echo "ok: $label (rc=$rc)"
}

echo "== dashboard-locale-format-contract-gate negative control =="

# --- positive control -------------------------------------------------------
seed
check "unmutated tree passes" 0

# --- the guard must fire on a stringified translation expression ------------
seed
printf "\nconst stringified = '{t.trust_score}';\n" >> "$TMP/tree/src/components/screens/UserDashboard.jsx"
check "stringified {t.x} expression detected" 1

# --- legitimate JSX must NOT be rejected ------------------------------------
# A quote elsewhere on the line is not stringification: the quote must be adjacent
# to the expression. An earlier pattern matched any quote on the line and rejected
# <span className='label'>{t.x}</span>, a false positive that would block CI on
# ordinary formatting.
seed
printf "\nconst el = <span className='label'>{t.trust_score}</span>;\n" >> "$TMP/tree/src/components/screens/UserDashboard.jsx"
check "legitimate JSX with a quote elsewhere is not rejected" 0

# --- and it must still fire when the input is large enough to fill the pipe --
# This is the SIGPIPE/pipefail case: a quote early, thousands of matches after.
# Under the piped form this returned rc=141 and the guard was skipped.
seed
{
  printf "const early = '{t.early}';\n"
  i=0
  while [ "$i" -lt 20000 ]; do printf '{t.key%d}\n' "$i"; i=$((i + 1)); done
} >> "$TMP/tree/src/components/screens/UserDashboard.jsx"
check "large input with an early quote still detected (pipefail/SIGPIPE)" 1

# --- fixed-language copy guard still works ----------------------------------
seed
printf "\nconst label = 'Trust Score';\n" >> "$TMP/tree/src/components/screens/UserDashboard.jsx"
check "fixed-language trust copy detected" 1

# --- the gate is not a pipeline any more ------------------------------------
# Comment lines are excluded: the gate's own explanatory note quotes the broken
# pattern, and matching that would fail this control on a correct gate.
if grep -vE '^[[:space:]]*#' "$ROOT/$GATE" | grep -qE 'grep [^|]*\|[[:space:]]*grep'; then
  echo "FAIL: gate reintroduced a grep pipeline; SIGPIPE under pipefail can skip it" >&2
  exit 1
fi
echo "ok: gate contains no grep pipeline"

echo "dashboard-locale-format-contract-gate negative control OK"
