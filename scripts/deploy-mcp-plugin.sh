#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/mercasto}"
DOMAIN="mcp.mercasto.com"
APP_DIR="/opt/mercasto-mcp-plugin"
APP_NEXT="${APP_DIR}.next.$$"
UNIT_SRC="$PROJECT_DIR/ops/mcp-plugin/mercasto-mcp-plugin.service"
UNIT_DST="/etc/systemd/system/mercasto-mcp-plugin.service"
BRIDGE_UNIT="/etc/systemd/system/mercasto-mcp-edge-bridge.service"
EDGE_CONF="/etc/mercasto-edge/harness.conf"
HTTP_TEMPLATE="$PROJECT_DIR/ops/mcp-plugin/nginx-http.conf.template"
HTTPS_TEMPLATE="$PROJECT_DIR/ops/mcp-plugin/nginx-https.conf.template"
MCP_PORT=8780
BRIDGE_PORT=18780

cleanup() {
  rm -rf "$APP_NEXT" /tmp/mercasto-mcp-http.* /tmp/mercasto-mcp-https.* /tmp/mercasto-mcp-block.*
}
trap cleanup EXIT

if [ "$(id -u)" -ne 0 ]; then
  echo "MCP_PLUGIN_DEPLOY_REQUIRES_ROOT" >&2
  exit 64
fi

if [ "${CONFIRM:-}" != "MERCASTO" ]; then
  echo "MCP_PLUGIN_DEPLOY_REQUIRES_CONFIRM=MERCASTO" >&2
  exit 64
fi

cd "$PROJECT_DIR"

for file in   mcp-plugin/package.json   mcp-plugin/server.mjs   "$UNIT_SRC"   "$HTTP_TEMPLATE"   "$HTTPS_TEMPLATE"   "$EDGE_CONF"
do
  test -s "$file" || { echo "Missing required file: $file" >&2; exit 65; }
done

command -v node >/dev/null 2>&1 || { echo "node is required" >&2; exit 66; }
command -v npm >/dev/null 2>&1 || { echo "npm is required" >&2; exit 66; }
command -v docker >/dev/null 2>&1 || { echo "docker is required" >&2; exit 66; }
command -v socat >/dev/null 2>&1 || { echo "socat is required" >&2; exit 66; }

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js >=20 is required; found $(node --version)" >&2
  exit 66
fi

echo "== Stage MCP plugin =="
install -d -m 0755 "$APP_NEXT"
install -m 0644 mcp-plugin/package.json "$APP_NEXT/package.json"
install -m 0644 mcp-plugin/server.mjs "$APP_NEXT/server.mjs"
(
  cd "$APP_NEXT"
  npm install --omit=dev --ignore-scripts --no-audit --no-fund
)
node --check "$APP_NEXT/server.mjs"

rm -rf "$APP_DIR.old"
if [ -d "$APP_DIR" ]; then
  mv "$APP_DIR" "$APP_DIR.old"
fi
mv "$APP_NEXT" "$APP_DIR"
rm -rf "$APP_DIR.old"

install -m 0644 "$UNIT_SRC" "$UNIT_DST"

BRIDGE_GATEWAY="$(docker network inspect mercasto_default --format '{{(index .IPAM.Config 0).Gateway}}')"
test -n "$BRIDGE_GATEWAY"

cat >"$BRIDGE_UNIT" <<EOF
[Unit]
Description=Mercasto MCP loopback bridge for shared edge
After=network-online.target docker.service mercasto-mcp-plugin.service
Requires=mercasto-mcp-plugin.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/socat TCP-LISTEN:$BRIDGE_PORT,bind=$BRIDGE_GATEWAY,reuseaddr,fork TCP:127.0.0.1:$MCP_PORT
Restart=on-failure
RestartSec=2
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ProtectHome=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
RestrictRealtime=yes
LockPersonality=yes
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mercasto-mcp-plugin.service mercasto-mcp-edge-bridge.service >/dev/null
systemctl restart mercasto-mcp-plugin.service
systemctl restart mercasto-mcp-edge-bridge.service

for attempt in $(seq 1 30); do
  if curl -fsS --max-time 3 "http://127.0.0.1:$MCP_PORT/healthz" >/tmp/mercasto-mcp-local-health.json 2>/dev/null; then
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    systemctl status mercasto-mcp-plugin.service --no-pager -l || true
    journalctl -u mercasto-mcp-plugin.service -n 100 --no-pager || true
    echo "MCP_PLUGIN_LOCAL_NOT_READY" >&2
    exit 67
  fi
  sleep 1
done

curl -fsS --max-time 3 -H "Host: $DOMAIN" "http://$BRIDGE_GATEWAY:$BRIDGE_PORT/healthz" >/tmp/mercasto-mcp-bridge-health.json

render_template() {
  local source="$1"
  local output="$2"
  sed "s/__MCP_BRIDGE_HOST__/$BRIDGE_GATEWAY/g" "$source" >"$output"
}

replace_edge_block() {
  local rendered="$1"
  local tmp
  tmp="$(mktemp /tmp/mercasto-mcp-block.XXXXXX)"
  python3 - "$EDGE_CONF" "$rendered" "$tmp" <<'PY'
import re, sys
from pathlib import Path

edge = Path(sys.argv[1])
rendered = Path(sys.argv[2]).read_text().rstrip()
target = Path(sys.argv[3])
text = edge.read_text()

text = re.sub(
    r'\n?# MERCASTO_MCP_PLUGIN_BEGIN.*?# MERCASTO_MCP_PLUGIN_END\n?',
    '\n',
    text,
    flags=re.S,
)
block = (
    "\n\n# MERCASTO_MCP_PLUGIN_BEGIN\n"
    + rendered
    + "\n# MERCASTO_MCP_PLUGIN_END\n"
)
target.write_text(text.rstrip() + block)
PY
  install -m 0644 "$tmp" "$EDGE_CONF"
}

echo "== Install HTTP bootstrap edge =="
HTTP_RENDERED="$(mktemp /tmp/mercasto-mcp-http.XXXXXX)"
render_template "$HTTP_TEMPLATE" "$HTTP_RENDERED"
replace_edge_block "$HTTP_RENDERED"
docker exec mercasto_frontend_container nginx -t
docker exec mercasto_frontend_container nginx -s reload

DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}' || true)"
if [ -z "$DNS_IP" ]; then
  echo "MCP_PLUGIN_LOCAL_READY=1"
  echo "MCP_PLUGIN_DNS_PENDING=1"
  echo "MCP_PLUGIN_DOMAIN=$DOMAIN"
  exit 0
fi

echo "dns_ip=$DNS_IP"

if ! command -v certbot >/dev/null 2>&1; then
  echo "MCP_PLUGIN_CERTBOT_MISSING" >&2
  exit 68
fi

install -d -m 0755 /var/www/certbot

echo "== Ensure TLS certificate =="
if ! certbot certonly   --webroot   -w /var/www/certbot   -d "$DOMAIN"   --non-interactive   --agree-tos   --register-unsafely-without-email   --keep-until-expiring; then
  echo "MCP_PLUGIN_LOCAL_READY=1"
  echo "MCP_PLUGIN_CERT_PENDING=1"
  exit 0
fi

test -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
test -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem"

echo "== Install HTTPS edge =="
HTTPS_RENDERED="$(mktemp /tmp/mercasto-mcp-https.XXXXXX)"
render_template "$HTTPS_TEMPLATE" "$HTTPS_RENDERED"
replace_edge_block "$HTTPS_RENDERED"
docker exec mercasto_frontend_container nginx -t
docker exec mercasto_frontend_container nginx -s reload

echo "== External health smoke =="
curl -fsS --max-time 15 "https://$DOMAIN/healthz" >/tmp/mercasto-mcp-external-health.json

echo "== MCP tools/list smoke =="
TOOLS_RESPONSE="$(curl -fsS --max-time 30   -X POST "https://$DOMAIN/mcp"   -H 'Content-Type: application/json'   -H 'Accept: application/json, text/event-stream'   --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}')"

for tool in server_resources production_status runner_status integration_status; do
  printf '%s' "$TOOLS_RESPONSE" | grep -q ""$tool""
done

if printf '%s' "$TOOLS_RESPONSE" | grep -Eiq '"name"[[:space:]]*:[[:space:]]*"[^"]*(shell|exec|restart|deploy|write|delete|docker)[^"]*"'; then
  echo "Unexpected write-capable-looking tool name exposed" >&2
  exit 69
fi

echo "MCP_PLUGIN_READY=https://$DOMAIN/mcp"
