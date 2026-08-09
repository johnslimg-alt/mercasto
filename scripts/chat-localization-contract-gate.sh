#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCREEN="$ROOT/src/components/screens/ChatScreen.jsx"
TRANSLATIONS="$ROOT/src/constants/translations"

echo "== Chat localization contract gate =="
for key in \
  chat_empty_hint chat_load_failed chat_polling chat_realtime chat_safety \
  chat_send_failed chat_start chat_target_missing new_message no_messages \
  retry select_conversation seller sendMessage write_message; do
  for lang in es en pt fr zh ko de it ar ru ja; do
    grep -qF "${key}:" "$TRANSLATIONS/${lang}.js"
  done
done

grep -qF 'formatDateTime' "$SCREEN"
if grep -Eq 'payload\.(message|error)|sendError\.message' "$SCREEN"; then
  echo "Chat UI must not surface backend-localized error messages" >&2
  exit 1
fi
if grep -Eq "t\.[A-Za-z0-9_]+[[:space:]]*\|\|" "$SCREEN"; then
  echo "Chat screen must not rely on inline language fallbacks" >&2
  exit 1
fi

echo "chat localization contract gate OK"
