#!/usr/bin/env bash
# Negative controls for scripts/chat-ui-flow-gate.sh.
#
# The gate it replaces asserted that the two Playwright specs contain certain
# text; nothing executed them, and a title mentioned only in a comment satisfied
# the check. These fixtures prove the hardened gate fails when a spec stops
# declaring the test, and when no CI workflow executes the specs at all. No
# browser is launched by this test: the execution tier is exercised in CI.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-chat-gate.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/scripts" \
  "$TMP_DIR/src/components/screens" \
  "$TMP_DIR/src/components/shell" \
  "$TMP_DIR/src/app" \
  "$TMP_DIR/tests/e2e" \
  "$TMP_DIR/.github/workflows"

cp "$ROOT_DIR/scripts/chat-ui-flow-gate.sh" "$TMP_DIR/scripts/"
cp "$ROOT_DIR/scripts/playwright-spec-titles.mjs" "$TMP_DIR/scripts/"

cat > "$TMP_DIR/src/components/screens/ChatScreen.jsx" <<'JSX'
fetch('/chat/conversations');
fetch('/chat/messages');
echo.listen('.message.sent');
const CHAT_POLL_INTERVAL_MS = 20000;
JSX

cat > "$TMP_DIR/src/App.jsx" <<'JSX'
<Route path="/mensajes" element={<ChatScreen />} />
JSX

cat > "$TMP_DIR/src/components/shell/AppHeader.jsx" <<'JSX'
navigate('/mensajes?conversation=1');
JSX

cat > "$TMP_DIR/src/components/shell/MobileTabBar.jsx" <<'JSX'
navigate('/mensajes');
JSX

cat > "$TMP_DIR/src/app/lazyScreens.jsx" <<'JSX'
import('../components/screens/ChatScreen');
JSX

cat > "$TMP_DIR/src/components/screens/AdDetailScreen.jsx" <<'JSX'
return `/mensajes?${params.toString()}`;
data-testid="guest-contact-auth"
channel: 'internal'
JSX

cat > "$TMP_DIR/tests/e2e/chat-flow.spec.js" <<'SPEC'
import { expect, test } from '@playwright/test';

test.describe('marketplace internal chat', () => {
  test('starts a listing conversation and keeps the message after server creation', async ({ page }) => {
    expect({ receiver_id: seller.id, ad_id: 42, content: 'Sigue disponible?' }).toBeTruthy();
    expect('conversation=77').toBeTruthy();
  });
});
SPEC

cat > "$TMP_DIR/tests/e2e/contact-auth-return.spec.js" <<'SPEC'
import { expect, test } from '@playwright/test';

test('login restores the exact listing contact intent', async ({ page }) => {
  expect(page).toBeTruthy();
});
SPEC

cat > "$TMP_DIR/.github/workflows/production-checks.yml" <<'YAML'
jobs:
  chat-ui-flow-execution:
    steps:
      - run: CHAT_UI_FLOW_GATE_EXECUTE=1 bash scripts/chat-ui-flow-gate.sh
YAML

run_gate() {
  set +e
  gate_output="$(bash "$TMP_DIR/scripts/chat-ui-flow-gate.sh" 2>&1)"
  gate_status=$?
  set -e
}

expect_failure() {
  local label="$1" expected="$2"
  run_gate
  if (( gate_status == 0 )); then
    echo "chat UI flow gate accepted a broken tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
  if ! grep -qF "$expected" <<<"$gate_output"; then
    echo "chat UI flow gate failed for the wrong reason: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

expect_nonzero() {
  local label="$1"
  run_gate
  if (( gate_status == 0 )); then
    echo "chat UI flow gate accepted a broken tree: $label" >&2
    echo "$gate_output" >&2
    exit 1
  fi
}

# 1. Wiring intact and both specs declare their tests: passes in static mode.
run_gate
if (( gate_status != 0 )); then
  echo 'chat UI flow gate rejected the wired fixture' >&2
  echo "$gate_output" >&2
  exit 1
fi
grep -qF 'marketplace chat UI flow gate OK' <<<"$gate_output"

# 2. The chat title survives only as a comment. The old `grep -qF` assertions are
#    still satisfied, the declared-test check is not.
cat > "$TMP_DIR/tests/e2e/chat-flow.spec.js" <<'SPEC'
import { expect, test } from '@playwright/test';

// starts a listing conversation and keeps the message after server creation
test.describe('marketplace internal chat', () => {
  test('send works', async ({ page }) => {
    expect({ receiver_id: seller.id, ad_id: 42, content: 'Sigue disponible?' }).toBeTruthy();
    expect('conversation=77').toBeTruthy();
  });
});
SPEC
grep -qF "starts a listing conversation and keeps the message after server creation" "$TMP_DIR/tests/e2e/chat-flow.spec.js"
expect_failure 'chat flow spec title only in a comment' 'declares no test titled'

# 3. The auth-return spec is deleted.
rm "$TMP_DIR/tests/e2e/contact-auth-return.spec.js"
expect_nonzero 'auth return spec missing'

# 4. Nothing executes the specs any more.
cp "$ROOT_DIR/tests/e2e/contact-auth-return.spec.js" "$TMP_DIR/tests/e2e/contact-auth-return.spec.js"
cp "$ROOT_DIR/tests/e2e/chat-flow.spec.js" "$TMP_DIR/tests/e2e/chat-flow.spec.js"
sed -i '/CHAT_UI_FLOW_GATE_EXECUTE=1/d' "$TMP_DIR/.github/workflows/production-checks.yml"
expect_failure 'specs orphaned from CI' 'no CI workflow executes the chat UI flow specs'

# 5. Execution requested but the Playwright dependency is absent: the gate must
#    fail loudly instead of reporting a green run it never performed.
cat > "$TMP_DIR/.github/workflows/production-checks.yml" <<'YAML'
jobs:
  chat-ui-flow-execution:
    steps:
      - run: CHAT_UI_FLOW_GATE_EXECUTE=1 bash scripts/chat-ui-flow-gate.sh
YAML
step_output="$(cd "$TMP_DIR" && CHAT_UI_FLOW_GATE_EXECUTE=1 bash scripts/chat-ui-flow-gate.sh 2>&1)" && step_status=0 || step_status=$?
if (( step_status == 0 )); then
  echo 'chat UI flow gate reported success with execution requested but no Playwright' >&2
  echo "$step_output" >&2
  exit 1
fi
grep -qF '@playwright/test is not installed' <<<"$step_output"

echo 'chat UI flow gate regression test OK'
