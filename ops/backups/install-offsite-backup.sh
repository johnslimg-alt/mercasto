#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
[[ "$(id -u)" -eq 0 ]] || { echo "must run as root" >&2; exit 1; }
for secret in /root/.secrets/mercasto-r2-backup.env /root/.secrets/mercasto-backup-passphrase; do
  test -f "$secret"
  test "$(stat -c %a "$secret")" = "600"
done
install -o root -g root -m 700 "$ROOT_DIR/ops/backups/mercasto-offsite-backup.py" /usr/local/sbin/mercasto-offsite-backup
for unit in mercasto-offsite-backup.service mercasto-offsite-backup.timer \
  mercasto-offsite-backup-alert.service mercasto-offsite-restore-drill.service \
  mercasto-offsite-restore-drill.timer; do
  install -o root -g root -m 644 "$ROOT_DIR/ops/systemd/$unit" "/etc/systemd/system/$unit"
done
install -d -o root -g root -m 700 /var/lib/mercasto-offsite-backup
systemctl daemon-reload
systemctl enable --now mercasto-offsite-backup.timer mercasto-offsite-restore-drill.timer
systemctl is-active --quiet mercasto-offsite-backup.timer
systemctl is-active --quiet mercasto-offsite-restore-drill.timer
echo "offsite backup units installed"
