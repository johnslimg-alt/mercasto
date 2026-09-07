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
root_use=$(df -P / | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')
if [ "${root_use:-0}" -ge 80 ]; then
  echo "WARNING: root filesystem usage is ${root_use}%; review Docker build cache before it becomes operational pressure."
fi
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
