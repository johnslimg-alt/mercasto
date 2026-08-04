#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CSS="src/index.css"
CHAT="src/components/screens/ChatScreen.jsx"
DETAIL="src/components/screens/AdDetailScreen.jsx"
TEST="tests/design-token-contract.test.mjs"
DOC="docs/design/token-contract.md"

echo "== Design token contract gate =="

for file in "$CSS" "$CHAT" "$DETAIL" "$TEST" "$DOC"; do
  test -f "$file"
done

grep -qF -- "--mc-design-contract: '2026-08-04'" "$CSS"
grep -qF -- "--color-lime-primary: #84CC16" "$CSS"
grep -qF -- "--color-lime-dark: #65A30D" "$CSS"
grep -qF -- "--mc-ink: #111827" "$CSS"
grep -qF -- "--mc-paper: #F8FAFC" "$CSS"
grep -qF -- "--mc-dark-surface: #111827" "$CSS"
grep -qF -- "--mc-radius-lg: 14px" "$CSS"
grep -qF -- "--mc-touch-target: 48px" "$CSS"
grep -qF -- "min-height: var(--mc-touch-target)" "$CSS"
grep -qF -- "border-radius: var(--mc-radius-lg)" "$CSS"
grep -qF -- "className=\"mc-control" "$CHAT"
grep -qF -- "className=\"mc-primary-action mc-icon-button\"" "$CHAT"
grep -qF -- "className=\"mc-primary-action" "$DETAIL"

if grep -Eqi '#0f8f7d|#0b6f61' "$CSS"; then
  echo "Legacy turquoise brand aliases are forbidden." >&2
  exit 1
fi

node --test "$TEST"
echo "design token contract gate OK"
