#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VPS_LAUNCHER="start_mcp_vps.sh"
LOCAL_LAUNCHER="start_mcp_chatgpt.cjs"
GUIDE="docs/mcp-agents.md"
PLUGIN="mcp-plugin/server.mjs"
PLUGIN_PACKAGE="mcp-plugin/package.json"
PLUGIN_DOCKERFILE="mcp-plugin/Dockerfile"
COMPOSE="docker-compose.yml"
NGINX="default.conf"

for file in   "$VPS_LAUNCHER"   "$LOCAL_LAUNCHER"   "$GUIDE"   "$PLUGIN"   "$PLUGIN_PACKAGE"   "$PLUGIN_DOCKERFILE"   "$COMPOSE"   "$NGINX"
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

# The old arbitrary-shell service stays retired. The historical hostname may be
# reused only by the new bounded read-only plugin and its documentation/config.
allowed_hostname_paths=(
  "default.conf"
  "docs/mcp-agents.md"
  "mcp-plugin/server.mjs"
  "scripts/server-operator.sh"
  "scripts/workflow-concurrency-guard.test.mjs"
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

grep -qF '"@modelcontextprotocol/server": "2.0.0"' "$PLUGIN_PACKAGE"
grep -qF '"@modelcontextprotocol/express": "2.0.0"' "$PLUGIN_PACKAGE"
grep -qF '"@modelcontextprotocol/node": "2.0.0"' "$PLUGIN_PACKAGE"
grep -qF "const HOST = process.env.MCP_BIND_HOST || '127.0.0.1';" "$PLUGIN"
grep -qF "const PORT = Number.parseInt(process.env.MCP_PORT || '8780', 10);" "$PLUGIN"
grep -qF 'readOnlyHint: true' "$PLUGIN"
grep -qF 'destructiveHint: false' "$PLUGIN"
grep -qF "app.all('/mcp'" "$PLUGIN"

for tool in mcp_runtime_status production_status github_operator_status mcp_server_info; do
  grep -qF "'$tool'" "$PLUGIN"
done

# Public server implementation must not gain command execution, host-control or
# unrestricted filesystem capabilities.
if grep -Eiq '(child_process|\bspawn\(|\bexec\(|\bexecFile\(|shell[[:space:]]*:[[:space:]]*true|bash-mcp|supergateway|pinggy|tunnelmole|mcp-sse-bridge|docker[[:space:]]+(exec|run|restart|rm|compose)|git[[:space:]]+(push|reset|clean|checkout|switch)|readFile\(|writeFile\(|readdir\(|unlink\(|rm\(|rename\()' "$PLUGIN"; then
  echo "Read-only MCP plugin contains a forbidden host-control or filesystem primitive." >&2
  exit 1
fi
grep -qF "fs.statfs('/')" "$PLUGIN"

grep -qF 'USER node' "$PLUGIN_DOCKERFILE"
grep -qF 'MCP_BIND_HOST=0.0.0.0' "$PLUGIN_DOCKERFILE"
grep -qF 'EXPOSE 8780' "$PLUGIN_DOCKERFILE"

plugin_block="$(
  awk '
    /^  mercasto-mcp-plugin:/ { in_plugin=1; print; next }
    in_plugin && /^  [A-Za-z0-9_-]+:/ { exit }
    in_plugin { print }
  ' "$COMPOSE"
)"
grep -qF 'read_only: true' <<<"$plugin_block"
grep -qF 'no-new-privileges:true' <<<"$plugin_block"
grep -qF 'cap_drop:' <<<"$plugin_block"
grep -qF -- '- ALL' <<<"$plugin_block"
grep -qF 'expose:' <<<"$plugin_block"
if grep -qE '^[[:space:]]+ports:|/var/run/docker.sock|^[[:space:]]+volumes:' <<<"$plugin_block"; then
  echo "MCP plugin Compose service must not expose host ports, Docker socket or host volumes." >&2
  exit 1
fi

# Public MCP edge must keep ACME on HTTP and serve the transport only over
# the dedicated TLS vhost. The origin certificate lineage is fixed and reviewed.
nginx_block="$(
  sed -n '/# MERCASTO_MCP_PLUGIN_HTTP_BOOTSTRAP_BEGIN/,/# MERCASTO_MCP_PLUGIN_HTTP_BOOTSTRAP_END/p' "$NGINX"
)"
grep -qF 'server_name mcp.mercasto.com;' <<<"$nginx_block"
grep -qF 'location ^~ /.well-known/acme-challenge/' <<<"$nginx_block"
grep -qF 'return 308 https://$host$request_uri;' <<<"$nginx_block"
grep -qF 'listen 443 ssl;' <<<"$nginx_block"
grep -qF 'ssl_certificate /etc/letsencrypt/live/mcp.mercasto.com-0001/fullchain.pem;' <<<"$nginx_block"
grep -qF 'ssl_certificate_key /etc/letsencrypt/live/mcp.mercasto.com-0001/privkey.pem;' <<<"$nginx_block"
grep -qF 'location = /healthz' <<<"$nginx_block"
grep -qF 'location = /mcp' <<<"$nginx_block"
grep -qF 'proxy_buffering off;' <<<"$nginx_block"
grep -qF 'proxy_request_buffering off;' <<<"$nginx_block"
grep -qF 'add_header Cache-Control "no-store" always;' <<<"$nginx_block"
if grep -Eq 'proxy_pass[[:space:]]+https?://[^$"]' <<<"$nginx_block"; then
  echo "MCP edge proxy target must remain the fixed Docker service variable." >&2
  exit 1
fi
if grep -Eq '(/sse|:8001([^0-9]|$)|bash-mcp|supergateway|mcp-sse-bridge)' <<<"$nginx_block"; then
  echo "Retired public-shell or SSE transport must not return through MCP HTTPS." >&2
  exit 1
fi

echo "MCP public-shell retirement + read-only plugin gate OK"
