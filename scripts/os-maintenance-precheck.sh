#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

require_cmd docker
require_cmd git
require_cmd apt
require_cmd ps

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

echo "== Repository =="
git status --short
git rev-parse --short HEAD

echo "== Compose config =="
docker compose "${COMPOSE_FILES[@]}" config >/tmp/mercasto_compose_maintenance_config.out
echo "compose config OK"

echo "== Containers =="
docker compose "${COMPOSE_FILES[@]}" ps

echo "== Recent critical logs =="
docker compose "${COMPOSE_FILES[@]}" logs --tail=80 mercasto-backend mercasto-frontend postgres redis || true

echo "== Backups =="
if [[ -d postgres-backups ]]; then
  ls -lah postgres-backups | tail -20
else
  echo "postgres-backups directory missing" >&2
fi

echo "== Pending apt updates =="
apt list --upgradable 2>/dev/null || true

echo "== Zombie processes =="
ps aux | awk '$8 ~ /Z/ { print }' || true

echo "== Disk and memory =="
df -h /
free -h

echo "maintenance precheck complete"
