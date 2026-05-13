#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SESSION_CONFIG="backend/config/session.php"

command -v grep >/dev/null 2>&1 || {
  echo "grep is required" >&2
  exit 1
}

echo "== Session config scan =="

test -f "$SESSION_CONFIG"

grep -q "'secure' =>" "$SESSION_CONFIG"
grep -q "'http_only' =>" "$SESSION_CONFIG"
grep -q "'same_site' =>" "$SESSION_CONFIG"
grep -q "'domain' =>" "$SESSION_CONFIG"
grep -q "'driver' =>" "$SESSION_CONFIG"
grep -q "'lifetime' =>" "$SESSION_CONFIG"

echo "session config scan OK"
