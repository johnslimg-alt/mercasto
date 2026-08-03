#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CONTROLLER="backend/app/Http/Controllers/Api/ChatController.php"
ROUTES="backend/routes/api.php"
CHANNELS="backend/routes/channels.php"
TEST="backend/tests/Feature/MarketplaceChatApiTest.php"

echo "== Marketplace chat API security gate =="

test -f "$CONTROLLER"
test -f "$ROUTES"
test -f "$CHANNELS"
test -f "$TEST"

grep -qF "'/chat/conversations'" "$ROUTES"
grep -qF "'/chat/conversations/{conversation}/messages'" "$ROUTES"
grep -qF "'/chat/messages'" "$ROUTES"
grep -qF "receiverId !== \$sellerId" "$CONTROLLER"
grep -qF "No existe una conversación para responder" "$CONTROLLER"
grep -qF "authorizeConversation" "$CONTROLLER"
grep -qF "receiver_id' => \$receiverId" "$CONTROLLER"
grep -qF "Broadcast::channel('chat.{id}'" "$CHANNELS"
grep -qF "test_buyer_cannot_redirect_an_ad_message_to_an_unrelated_user" "$TEST"
grep -qF "test_only_participants_can_read" "$TEST"

echo "marketplace chat API security gate OK"
