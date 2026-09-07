#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/mercasto}"
cd "$PROJECT_DIR"

echo "== Git status =="
git status --short
git log -1 --oneline

echo
echo "== Host reboot state =="
echo "kernel=$(uname -r)"
if [ -e /var/run/reboot-required ]; then
  echo "reboot_required=yes"
else
  echo "reboot_required=no"
fi

echo
echo "== Host storage =="
df -h /
storage_rc=0
bash scripts/host-storage-headroom-gate.sh || storage_rc=$?
docker system df

echo
echo "== Mercasto runtime containers =="
docker ps \
  --filter label=com.docker.compose.project=mercasto \
  --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'

echo
echo "== Public HTTP smoke =="
curl -fsSI --max-time 30 https://mercasto.com/ | head -n 20
curl -fsSI --max-time 30 https://mercasto.com/api/categories | head -n 20

if [ "$storage_rc" -ne 0 ]; then
  exit "$storage_rc"
fi
