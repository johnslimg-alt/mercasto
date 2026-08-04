#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SCREEN="src/components/screens/ChatScreen.jsx"
APP="src/App.jsx"
DETAIL="src/components/screens/AdDetailScreen.jsx"
TEST="tests/e2e/chat-flow.spec.js"

echo "== Marketplace chat UI flow gate =="

test -f "$SCREEN"
test -f "$TEST"

grep -qF '/chat/conversations' "$SCREEN"
grep -qF '/chat/messages' "$SCREEN"
grep -qF ".listen('.message.sent'" "$SCREEN"
grep -qF 'CHAT_POLL_INTERVAL_MS = 20000' "$SCREEN"
grep -qF "path=\"/mensajes\"" "$APP"
grep -qF "import('./components/screens/ChatScreen')" "$APP"
grep -qF "navigate('/mensajes" "$APP"
grep -qF '/mensajes?ad_id=' "$DETAIL"
grep -qF "channel: 'internal'" "$DETAIL"
grep -qF "starts a listing conversation and keeps the message after server creation" "$TEST"
grep -qF "receiver_id: seller.id" "$TEST"
grep -qF "conversation=77" "$TEST"

echo "marketplace chat UI flow gate OK"
