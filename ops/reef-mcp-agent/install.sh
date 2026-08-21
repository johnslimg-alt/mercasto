#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  SUDO=()
else
  SUDO=(sudo -n)
fi
"${SUDO[@]}" true

src_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install_dir="/opt/reef-mcp-agent"
service="reef-mcp-agent.service"

command -v node >/dev/null
command -v npm >/dev/null
command -v visudo >/dev/null
node --check "$src_dir/server.mjs"

if ! id reef-mcp >/dev/null 2>&1; then
  "${SUDO[@]}" useradd --system --home /nonexistent --shell /usr/sbin/nologin reef-mcp
fi

"${SUDO[@]}" install -d -o root -g reef-mcp -m 0750 "$install_dir"
"${SUDO[@]}" install -o root -g reef-mcp -m 0640 "$src_dir/package.json" "$install_dir/package.json"
"${SUDO[@]}" install -o root -g reef-mcp -m 0640 "$src_dir/server.mjs" "$install_dir/server.mjs"

cd "$install_dir"
"${SUDO[@]}" npm install --omit=dev --ignore-scripts --no-fund --no-audit
"${SUDO[@]}" chown -R root:reef-mcp "$install_dir"
"${SUDO[@]}" chmod -R o-rwx "$install_dir"
"${SUDO[@]}" find "$install_dir" -type d -exec chmod 0750 {} +
"${SUDO[@]}" find "$install_dir" -type f -exec chmod 0640 {} +

"${SUDO[@]}" install -o root -g root -m 0755 "$src_dir/reef-mcp-gate" /usr/local/sbin/reef-mcp-gate
cat >/tmp/reef-mcp-agent.sudoers <<'EOF'
Defaults:reef-mcp env_reset
reef-mcp ALL=(root) NOPASSWD: /usr/local/sbin/reef-mcp-gate *
EOF
"${SUDO[@]}" visudo -cf /tmp/reef-mcp-agent.sudoers
"${SUDO[@]}" install -o root -g root -m 0440 /tmp/reef-mcp-agent.sudoers /etc/sudoers.d/reef-mcp-agent
rm -f /tmp/reef-mcp-agent.sudoers

"${SUDO[@]}" install -o root -g root -m 0644 "$src_dir/reef-mcp-agent.service" "/etc/systemd/system/$service"
"${SUDO[@]}" systemctl daemon-reload
"${SUDO[@]}" systemctl enable "$service"
"${SUDO[@]}" systemctl restart "$service"

rm -f /tmp/reef-mcp-health.json
for _ in $(seq 1 15); do
  if curl -fsS --connect-timeout 1 --max-time 2 http://127.0.0.1:8765/health >/tmp/reef-mcp-health.json; then
    break
  fi
  sleep 1
done

systemctl show "$service" --no-pager -p ActiveState -p SubState -p MainPID -p NRestarts -p ExecMainStatus || true
if [ -f /tmp/reef-mcp-health.json ]; then
  cat /tmp/reef-mcp-health.json
  printf '\n'
else
  echo 'health response unavailable'
fi
ss -lntp 2>/dev/null | grep '127.0.0.1:8765' || true

if ! systemctl is-active --quiet "$service" || ! curl -fsS --connect-timeout 1 --max-time 3 http://127.0.0.1:8765/health >/dev/null; then
  journalctl -u "$service" -n 80 --no-pager || true
  exit 1
fi

echo REEF_MCP_AGENT_INSTALL_OK
