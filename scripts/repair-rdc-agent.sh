#!/usr/bin/env bash
set -euo pipefail

SERVICE="remote-desktop-commander.service"
UNIT="/etc/systemd/system/${SERVICE}"
LEGACY_SERVICE="desktop-commander.service"
RDC_VERSION="0.2.48"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=()
else
  SUDO=(sudo -n)
fi

command -v node >/dev/null
command -v npx >/dev/null
"${SUDO[@]}" true

echo "== Existing RDC processes/services =="
pgrep -af 'desktop-commander.*remote|desktop-commander/dist/index.js' || true
systemctl list-unit-files --no-legend 2>/dev/null | grep -Ei 'desktop.*commander|remote.*commander' || true

# A legacy systemd unit can respawn an old remote agent after we kill its PID.
# Retire it only when its ExecStart is clearly another Desktop Commander remote agent.
if systemctl show "$LEGACY_SERVICE" --no-pager -p LoadState 2>/dev/null | grep -q 'LoadState=loaded'; then
  legacy_exec="$(systemctl show "$LEGACY_SERVICE" --no-pager -p ExecStart --value 2>/dev/null || true)"
  if printf '%s\n' "$legacy_exec" | grep -Eqi 'desktop-commander.*remote|desktop-commander-device|desktop-commander/dist/index\.js.*remote'; then
    echo "Retiring duplicate legacy RDC unit: $LEGACY_SERVICE"
    "${SUDO[@]}" systemctl disable --now "$LEGACY_SERVICE" || true
  else
    echo "Legacy unit does not match an RDC remote-agent command; leaving it unchanged."
  fi
fi

TMP_UNIT="$(mktemp /tmp/remote-desktop-commander.service.XXXXXX)"
cleanup() {
  rm -f "$TMP_UNIT"
}
trap cleanup EXIT

cat >"$TMP_UNIT" <<'EOF'
[Unit]
Description=Remote Desktop Commander VPS agent
Wants=network-online.target
After=network-online.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=root
Environment=HOME=/root
WorkingDirectory=/root
ExecStart=/usr/bin/env npx -y @wonderwhy-er/desktop-commander@0.2.48 remote --persist-session
Restart=always
RestartSec=10
KillSignal=SIGINT
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
EOF

echo "Installing Desktop Commander remote service version ${RDC_VERSION}"
"${SUDO[@]}" install -o root -g root -m 0644 "$TMP_UNIT" "$UNIT"
"${SUDO[@]}" systemctl daemon-reload
"${SUDO[@]}" systemctl enable "$SERVICE"

# Stop unmanaged duplicate agents before starting the supervised instance.
mapfile -t old_pids < <(pgrep -f 'desktop-commander.*remote|desktop-commander/dist/index.js' || true)
for pid in "${old_pids[@]}"; do
  [ "$pid" = "$$" ] && continue
  kill "$pid" 2>/dev/null || true
done
sleep 2
"${SUDO[@]}" systemctl restart "$SERVICE"
sleep 12

systemctl show "$SERVICE" --no-pager -p ActiveState -p SubState -p MainPID -p NRestarts
if ! systemctl is-active --quiet "$SERVICE"; then
  journalctl -u "$SERVICE" -n 60 --no-pager | sed -E 's/[A-Z0-9]{4}-[A-Z0-9]{4}/****-****/g'
  exit 1
fi

echo "RDC_AGENT_REPAIR_OK version=${RDC_VERSION}"
