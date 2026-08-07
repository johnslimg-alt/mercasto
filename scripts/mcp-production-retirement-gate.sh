#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VPS_LAUNCHER="start_mcp_vps.sh"
LOCAL_LAUNCHER="start_mcp_chatgpt.cjs"
GUIDE="docs/mcp-agents.md"

for file in "$VPS_LAUNCHER" "$LOCAL_LAUNCHER" "$GUIDE"; do
  test -f "$file"
done

for retired_file in \
  scratch/nginx_mcp.conf \
  scratch/test-mcp-vps.cjs \
  scratch/test-mcp-vps.js
do
  if [[ -e "$retired_file" ]]; then
    echo "Retired public MCP artifact must not exist: $retired_file" >&2
    exit 1
  fi
done

HOSTNAME_SCAN="$(mktemp "${TMPDIR:-/tmp}/mercasto-public-mcp-hostname.XXXXXX")"
trap 'rm -f "$HOSTNAME_SCAN"' EXIT
if git grep -nF 'mcp.mercasto.com' -- \
  ':!docs/evidence/**' \
  ':!docs/mcp-agents.md' \
  ':!scripts/mcp-production-retirement-gate.sh' \
  >"$HOSTNAME_SCAN" 2>/dev/null; then
  cat "$HOSTNAME_SCAN" >&2
  echo "Retired public MCP hostname must not return to executable or active configuration files." >&2
  exit 1
fi

grep -qF 'Public Shell MCP on the Mercasto VPS is retired' "$VPS_LAUNCHER"
grep -qF 'exit 1' "$VPS_LAUNCHER"
grep -qF "process.env.ENABLE_PUBLIC_SHELL_MCP !== '1'" "$LOCAL_LAUNCHER"
grep -qF 'Production public-shell retirement' "$GUIDE"

if grep -Eq '(^|[;&|[:space:]])(nohup|npx|node|ssh)[[:space:]].*(pinggy|tunnelmole|bash-mcp|mcp-sse-bridge)' "$VPS_LAUNCHER"; then
  echo "Production MCP launcher must not start a public shell bridge or tunnel." >&2
  exit 1
fi

echo "MCP production retirement gate OK"
