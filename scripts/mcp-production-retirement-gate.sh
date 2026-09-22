#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VPS_LAUNCHER="start_mcp_vps.sh"
LOCAL_LAUNCHER="start_mcp_chatgpt.cjs"
GUIDE="docs/mcp-agents.md"
PLUGIN="mcp-plugin/server.mjs"
PLUGIN_PACKAGE="mcp-plugin/package.json"
DEPLOY="scripts/deploy-mcp-plugin.sh"
HTTP_TEMPLATE="ops/mcp-plugin/nginx-http.conf.template"
HTTPS_TEMPLATE="ops/mcp-plugin/nginx-https.conf.template"
UNIT="ops/mcp-plugin/mercasto-mcp-plugin.service"

for file in   "$VPS_LAUNCHER"   "$LOCAL_LAUNCHER"   "$GUIDE"   "$PLUGIN"   "$PLUGIN_PACKAGE"   "$DEPLOY"   "$HTTP_TEMPLATE"   "$HTTPS_TEMPLATE"   "$UNIT"
do
  test -f "$file"
done

for retired_file in   scratch/nginx_mcp.conf   scratch/test-mcp-vps.cjs   scratch/test-mcp-vps.js
do
  if [[ -e "$retired_file" ]]; then
    echo "Retired public MCP artifact must not exist: $retired_file" >&2
    exit 1
  fi
done

# The old arbitrary-shell service stays retired. Reusing the historical hostname
# is permitted only for the new bounded read-only status plugin and its deployment
# documentation/configuration. Any other active/executable use is a regression.
allowed_hostname_paths=(
  "docs/mcp-agents.md"
  "mcp-plugin/server.mjs"
  "ops/mcp-plugin/nginx-http.conf.template"
  "ops/mcp-plugin/nginx-https.conf.template"
  "scripts/deploy-mcp-plugin.sh"
  "scripts/mcp-production-retirement-gate.sh"
)

HOSTNAME_SCAN="$(mktemp "${TMPDIR:-/tmp}/mercasto-mcp-hostname.XXXXXX")"
trap 'rm -f "$HOSTNAME_SCAN"' EXIT
git grep -nF 'mcp.mercasto.com' -- ':!docs/evidence/**' >"$HOSTNAME_SCAN" 2>/dev/null || true

while IFS=: read -r file _; do
  [ -n "$file" ] || continue
  allowed=0
  for expected in "${allowed_hostname_paths[@]}"; do
    if [ "$file" = "$expected" ]; then
      allowed=1
      break
    fi
  done
  if [ "$allowed" -ne 1 ]; then
    echo "mcp.mercasto.com is used outside the bounded read-only plugin surface: $file" >&2
    exit 1
  fi
done <"$HOSTNAME_SCAN"

grep -qF 'Public Shell MCP on the Mercasto VPS is retired' "$VPS_LAUNCHER"
grep -qF 'exit 1' "$VPS_LAUNCHER"
grep -qF "process.env.ENABLE_PUBLIC_SHELL_MCP !== '1'" "$LOCAL_LAUNCHER"
grep -qF 'Production public-shell retirement' "$GUIDE"
grep -qF 'read-only MCP plugin' "$GUIDE"

if grep -Eq '(^|[;&|[:space:]])(nohup|npx|node|ssh)[[:space:]].*(pinggy|tunnelmole|bash-mcp|mcp-sse-bridge)' "$VPS_LAUNCHER"; then
  echo "Production MCP launcher must not start a public shell bridge or tunnel." >&2
  exit 1
fi

# New plugin must use the official MCP v2 stack and remain read-only by contract.
grep -qF '"@modelcontextprotocol/server": "2.0.0"' "$PLUGIN_PACKAGE"
grep -qF '"@modelcontextprotocol/express": "2.0.0"' "$PLUGIN_PACKAGE"
grep -qF '"@modelcontextprotocol/node": "2.0.0"' "$PLUGIN_PACKAGE"
grep -qF "const HOST = process.env.MCP_BIND_HOST || '127.0.0.1';" "$PLUGIN"
grep -qF "const PORT = Number.parseInt(process.env.MCP_PORT || '8780', 10);" "$PLUGIN"
grep -qF 'readOnlyHint: true' "$PLUGIN"
grep -qF 'destructiveHint: false' "$PLUGIN"
grep -qF "app.all('/mcp'" "$PLUGIN"
grep -qF 'DynamicUser=yes' "$UNIT"
grep -qF 'NoNewPrivileges=yes' "$UNIT"

for tool in server_resources production_status runner_status integration_status; do
  grep -qF "'$tool'" "$PLUGIN"
done

# Shell/tunnel primitives must never return in the production plugin implementation.
if grep -Eiq '(bash-mcp|supergateway|pinggy|tunnelmole|mcp-sse-bridge|shell[[:space:]]*:[[:space:]]*true|child_process.*spawn|\bspawn\(|\bexec\(|docker[[:space:]]+(exec|run|restart|rm|compose)|git[[:space:]]+(push|reset|clean|checkout|switch))' "$PLUGIN"; then
  echo "Read-only MCP plugin contains a forbidden shell/tunnel/mutation primitive." >&2
  exit 1
fi

# The only child-process call is execFile with a literal systemctl binary and a
# fixed unit allowlist; no tool input can become a command or unit name.
grep -qF "execFileAsync(" "$PLUGIN"
grep -qF "'/usr/bin/systemctl'" "$PLUGIN"
grep -qF 'SYSTEMD_ALLOWLIST' "$PLUGIN"
if grep -Eq 'execFileAsync\([^,]*[A-Za-z_$][A-Za-z0-9_$]*[[:space:]]*,' "$PLUGIN"; then
  echo "MCP plugin must not use a variable executable path." >&2
  exit 1
fi

# The deploy is bounded to fixed paths, a fixed domain and exact confirmation.
grep -qF 'CONFIRM:-}" != "MERCASTO"' "$DEPLOY"
grep -qF 'DOMAIN="mcp.mercasto.com"' "$DEPLOY"
grep -qF 'MCP_PORT=8780' "$DEPLOY"
grep -qF 'BRIDGE_PORT=18780' "$DEPLOY"
grep -qF 'MCP_PLUGIN_DNS_PENDING=1' "$DEPLOY"
grep -qF 'MCP_PLUGIN_READY=https://$DOMAIN/mcp' "$DEPLOY"

echo "MCP public-shell retirement + read-only plugin gate OK"
