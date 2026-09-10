#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
PORT="${QA_PORT:-48190}"
DB="/tmp/mercasto-qa-$$.db"
LOG="/tmp/mercasto-qa-$$.log"
cleanup(){ [ -n "${PID:-}" ] && kill "$PID" 2>/dev/null || true; rm -f "$DB" "$DB-shm" "$DB-wal" "$LOG"; }
trap cleanup EXIT INT TERM
cd "$ROOT"
if ss -ltn | grep -q ":$PORT "; then echo "QA port $PORT is already in use"; exit 1; fi
PORT="$PORT" HOST=127.0.0.1 DB_PATH="$DB" PREVIEW_MODE=1 node server.mjs >"$LOG" 2>&1 &
PID=$!
i=0
while [ "$i" -lt 40 ]; do
  body="$(curl -fsS "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true)"
  echo "$body" | grep -q '"service":"mercasto-standalone"' && break
  i=$((i+1)); sleep .2
done
body="$(curl -fsS "http://127.0.0.1:$PORT/api/health" 2>/dev/null || true)"
echo "$body" | grep -q '"service":"mercasto-standalone"' || { cat "$LOG"; exit 1; }
QA_BASE_URL="http://127.0.0.1:$PORT" node scripts/qa.mjs
