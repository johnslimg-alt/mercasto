#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCREEN="src/components/screens/ChatScreen.jsx"
APP="src/App.jsx"
LAZY_SCREENS="src/app/lazyScreens.jsx"
DETAIL="src/components/screens/AdDetailScreen.jsx"
TEST="tests/e2e/chat-flow.spec.js"
AUTH_RETURN_TEST="tests/e2e/contact-auth-return.spec.js"

echo "== Marketplace chat UI flow gate =="

test -f "$SCREEN"
test -f "$LAZY_SCREENS"
test -f "$TEST"
test -f "$AUTH_RETURN_TEST"

grep -qF '/chat/conversations' "$SCREEN"
grep -qF '/chat/messages' "$SCREEN"
grep -qF ".listen('.message.sent'" "$SCREEN"
grep -qF 'CHAT_POLL_INTERVAL_MS = 20000' "$SCREEN"
grep -qF "path=\"/mensajes\"" "$APP"
grep -qF "import('../components/screens/ChatScreen')" "$LAZY_SCREENS"
grep -qF "navigate('/mensajes" "$APP"
grep -qF 'return `/mensajes?${params.toString()}`' "$DETAIL"
grep -qF 'data-testid="guest-contact-auth"' "$DETAIL"
grep -qF "channel: 'internal'" "$DETAIL"
grep -qF "starts a listing conversation and keeps the message after server creation" "$TEST"
grep -qF "receiver_id: seller.id" "$TEST"
grep -qF "conversation=77" "$TEST"
grep -qF "login restores the exact listing contact intent" "$AUTH_RETURN_TEST"

echo "marketplace chat UI flow gate OK"
