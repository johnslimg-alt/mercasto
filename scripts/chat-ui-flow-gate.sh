#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCREEN="src/components/screens/ChatScreen.jsx"
APP="src/App.jsx"
HEADER="src/components/shell/AppHeader.jsx"
MOBILE_TAB="src/components/shell/MobileTabBar.jsx"
LAZY_SCREENS="src/app/lazyScreens.jsx"
DETAIL="src/components/screens/AdDetailScreen.jsx"
TEST="tests/e2e/chat-flow.spec.js"
AUTH_RETURN_TEST="tests/e2e/contact-auth-return.spec.js"
SPEC_TITLE_CHECK="scripts/playwright-spec-titles.mjs"

# ---------------------------------------------------------------------------
# What this gate proves, and what it does not.
#
# The gate has two layers:
#
#   STATIC (always): the chat route, its lazy import, the header/tab-bar entries
#   and the ad-detail contact intent still point at the same places, and the two
#   Playwright specs still DECLARE the tests this gate names. A named test that
#   exists only in a comment no longer satisfies the check.
#
#   EXECUTED (CHAT_UI_FLOW_GATE_EXECUTE=1): the two specs are actually run with
#   Chromium against CHAT_UI_FLOW_BASE_URL. Both specs intercept every /api/**
#   call with page.route(), so they need no backend and no production traffic;
#   CI runs them against the locally built frontend (`vite preview`).
#
# Because the static layer is cheap, it also has to stay honest about its own
# limits: it does NOT prove the chat UI works. It proves wiring and test
# reachability. A workflow that executes this gate with
# CHAT_UI_FLOW_GATE_EXECUTE=1 is required below, so the specs cannot silently
# become orphaned again (they were: nothing in the repository ran
# tests/e2e/chat-flow.spec.js or tests/e2e/contact-auth-return.spec.js, which is
# how a stale payload assertion in chat-flow.spec.js stayed "green").
# ---------------------------------------------------------------------------
EXECUTE="${CHAT_UI_FLOW_GATE_EXECUTE:-0}"
BASE_URL="${CHAT_UI_FLOW_BASE_URL:-https://mercasto.com}"

echo "== Marketplace chat UI flow gate =="

test -f "$SCREEN"
test -f "$HEADER"
test -f "$MOBILE_TAB"
test -f "$LAZY_SCREENS"
test -f "$TEST"
test -f "$AUTH_RETURN_TEST"
test -f "$SPEC_TITLE_CHECK"

grep -qF '/chat/conversations' "$SCREEN"
grep -qF '/chat/messages' "$SCREEN"
grep -qF ".listen('.message.sent'" "$SCREEN"
grep -qF 'CHAT_POLL_INTERVAL_MS = 20000' "$SCREEN"
grep -qF "path=\"/mensajes\"" "$APP"
grep -qF "import('../components/screens/ChatScreen')" "$LAZY_SCREENS"
grep -qF "navigate('/mensajes" "$HEADER"
grep -qF "navigate('/mensajes" "$MOBILE_TAB"
grep -qF 'return `/mensajes?${params.toString()}`' "$DETAIL"
grep -qF 'data-testid="guest-contact-auth"' "$DETAIL"
grep -qF "channel: 'internal'" "$DETAIL"
grep -qF "starts a listing conversation and keeps the message after server creation" "$TEST"
grep -qF "receiver_id: seller.id" "$TEST"
grep -qF "conversation=77" "$TEST"
grep -qF "login restores the exact listing contact intent" "$AUTH_RETURN_TEST"

# The titles above must be declared tests, not prose.
node "$SPEC_TITLE_CHECK" "$TEST" \
  'starts a listing conversation and keeps the message after server creation'
node "$SPEC_TITLE_CHECK" "$AUTH_RETURN_TEST" \
  'login restores the exact listing contact intent'

# Reachability: these specs are only covered while CI executes this gate.
if ! grep -rqF 'CHAT_UI_FLOW_GATE_EXECUTE=1' .github/workflows/; then
  echo "FAIL: no CI workflow executes the chat UI flow specs" >&2
  echo "      nothing runs $TEST or $AUTH_RETURN_TEST," >&2
  echo "      so asserting their contents proves only that the files exist." >&2
  echo "      expected a workflow step running this gate with CHAT_UI_FLOW_GATE_EXECUTE=1" >&2
  exit 1
fi

if [ "$EXECUTE" = "1" ]; then
  if [ ! -d node_modules/@playwright/test ]; then
    echo "FAIL: CHAT_UI_FLOW_GATE_EXECUTE=1 but @playwright/test is not installed" >&2
    echo "      run npm ci (CI does this before executing this gate)" >&2
    exit 1
  fi

  echo "Executing chat UI flow specs against $BASE_URL"
  BASE_URL="$BASE_URL" npx playwright test "$TEST" "$AUTH_RETURN_TEST" \
    --project=chromium-desktop --workers=1 --reporter=list

  echo "marketplace chat UI flow gate OK (2 specs executed against $BASE_URL)"
  exit 0
fi

echo "NOTE: CHAT_UI_FLOW_GATE_EXECUTE is not set in this invocation, so the specs were NOT" >&2
echo "      executed here; CI executes them via CHAT_UI_FLOW_GATE_EXECUTE=1 against the" >&2
echo "      locally built frontend." >&2
echo "marketplace chat UI flow gate OK (static wiring + declared test titles)"
