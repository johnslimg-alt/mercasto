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
require_cmd timeout

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

echo "== Repository =="
git status --short
git rev-parse --short HEAD

echo "== Compose config =="
compose_snapshot="$(mktemp "${TMPDIR:-/tmp}/mercasto-compose-maintenance.XXXXXX")"
log_snapshot=""
cleanup_snapshots() {
  rm -f "$compose_snapshot"
  [[ -z "$log_snapshot" ]] || rm -f "$log_snapshot"
}
trap cleanup_snapshots EXIT
docker compose "${COMPOSE_FILES[@]}" config >"$compose_snapshot"
echo "compose config OK"

echo "== Containers =="
docker compose "${COMPOSE_FILES[@]}" ps

echo "== Recent critical logs =="
log_snapshot="$(mktemp "${TMPDIR:-/tmp}/mercasto-maintenance-logs.XXXXXX")"
for container in \
  mercasto_backend_container \
  mercasto_frontend_container \
  mercasto_db_container \
  mercasto_redis_container
do
  log_path="$(docker inspect --format '{{.LogPath}}' "$container" 2>/dev/null || true)"
  if [[ -n "$log_path" && -r "$log_path" ]]; then
    tail -n 80 "$log_path" >>"$log_snapshot" 2>&1 || true
  elif ! timeout 4s docker logs --tail=80 "$container" >>"$log_snapshot" 2>&1; then
    echo "warning: bounded log snapshot failed for $container" >&2
  fi
done
critical_logs="$(grep -Ei 'critical|fatal|panic|segfault|out of memory|oom|unhandled|exception|(^|[^[:alpha:]])error([^[:alpha:]]|$)' "$log_snapshot" | tail -80 || true)"
if [[ -n "$critical_logs" ]]; then
  printf '%s\n' "$critical_logs"
else
  echo "no critical-pattern matches in bounded log snapshot"
fi

echo "== Backups =="
if [[ -d postgres-backups ]]; then
  ls -lah postgres-backups | tail -20
  backup_dir_mode="$(stat -c %a postgres-backups)"
  if [[ "$backup_dir_mode" != "2770" && "$backup_dir_mode" != "770" ]]; then
    echo "unsafe postgres-backups mode: $backup_dir_mode (expected 2770/770)" >&2
    exit 1
  fi
  unsafe_backups="$(find postgres-backups -maxdepth 1 -type f -name '*.dump' -perm /0137 -print -quit)"
  if [[ -n "$unsafe_backups" ]]; then
    echo "unsafe PostgreSQL backup permissions detected" >&2
    exit 1
  fi
  echo "backup permissions OK"
else
  echo "postgres-backups directory missing" >&2
  exit 1
fi

echo "== Reboot state =="
if [[ -f /var/run/reboot-required ]]; then
  echo "reboot_required=yes"
  sed -n '1,20p' /var/run/reboot-required.pkgs 2>/dev/null || true
else
  echo "reboot_required=no"
fi

echo "== Pending apt updates =="
mapfile -t pending_updates < <(apt list --upgradable 2>/dev/null | tail -n +2 || true)
echo "upgradable_count=${#pending_updates[@]}"
printf '%s\n' "${pending_updates[@]}" | sed -n '1,40p'
if (( ${#pending_updates[@]} > 40 )); then
  echo "... $(( ${#pending_updates[@]} - 40 )) more updates omitted"
fi

echo "== Zombie processes =="
zombie_output="$(ps aux | awk '$8 ~ /Z/ { print }' | head -20 || true)"
if [[ -n "$zombie_output" ]]; then
  printf '%s\n' "$zombie_output"
else
  echo "zombies=0"
fi

echo "== Disk and memory =="
df -h /
free -h

echo "maintenance precheck complete"
