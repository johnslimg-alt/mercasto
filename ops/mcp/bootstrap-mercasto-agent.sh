#!/usr/bin/env bash
set -euo pipefail

# Mercasto SSH MCP bootstrap
# Run this on the VPS as root after replacing PASTE_PUBLIC_KEY_HERE.
# It creates a non-root SSH user for MCP/Codex/Cursor agents.

PROJECT_DIR="${PROJECT_DIR:-/var/www/mercasto}"
AGENT_USER="${AGENT_USER:-mercasto-agent}"
PUBLIC_KEY="${PUBLIC_KEY:-PASTE_PUBLIC_KEY_HERE}"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: run as root" >&2
  exit 1
fi

if [ "$PUBLIC_KEY" = "PASTE_PUBLIC_KEY_HERE" ] || [ -z "$PUBLIC_KEY" ]; then
  echo "ERROR: set PUBLIC_KEY to the agent public SSH key before running." >&2
  echo "Example: PUBLIC_KEY='ssh-ed25519 AAAA...' bash ops/mcp/bootstrap-mercasto-agent.sh" >&2
  exit 1
fi

if [ ! -d "$PROJECT_DIR" ]; then
  echo "ERROR: project directory not found: $PROJECT_DIR" >&2
  exit 1
fi

id "$AGENT_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$AGENT_USER"

install -d -m 700 -o "$AGENT_USER" -g "$AGENT_USER" "/home/$AGENT_USER/.ssh"
printf '%s\n' "$PUBLIC_KEY" > "/home/$AGENT_USER/.ssh/authorized_keys"
chmod 600 "/home/$AGENT_USER/.ssh/authorized_keys"
chown "$AGENT_USER:$AGENT_USER" "/home/$AGENT_USER/.ssh/authorized_keys"

usermod -aG www-data "$AGENT_USER" || true
if getent group docker >/dev/null 2>&1; then
  usermod -aG docker "$AGENT_USER" || true
fi

if command -v setfacl >/dev/null 2>&1; then
  setfacl -R -m "u:$AGENT_USER:rwx" "$PROJECT_DIR"
  setfacl -dR -m "u:$AGENT_USER:rwx" "$PROJECT_DIR"
else
  chown -R root:www-data "$PROJECT_DIR"
  chmod -R g+rwX "$PROJECT_DIR"
fi

cat > /etc/sudoers.d/mercasto-agent <<'SUDOERS'
mercasto-agent ALL=(root) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose, /usr/bin/systemctl reload nginx, /usr/bin/systemctl restart nginx, /usr/bin/systemctl status nginx, /usr/sbin/nginx -t
SUDOERS
chmod 440 /etc/sudoers.d/mercasto-agent

cat <<EOF
OK: $AGENT_USER is ready for SSH MCP.
Project: $PROJECT_DIR
Test from MCP host:
ssh -i ~/.ssh/mercasto_agent_ed25519 $AGENT_USER@YOUR_SERVER_IP 'whoami && cd $PROJECT_DIR && git status --short'
EOF
