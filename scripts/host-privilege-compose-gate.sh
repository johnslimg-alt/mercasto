#!/usr/bin/env bash
set -euo pipefail
COMPOSE=docker-compose.yml
echo "== Host privilege Compose gate =="
for forbidden in '/var/run/docker.sock' '- /:/rootfs' '/var/lib/docker/' 'privileged:' 'network_mode: host'; do
  if grep -qF -- "$forbidden" "$COMPOSE"; then
    echo "FAIL: forbidden host privilege remains in Compose: $forbidden" >&2
    exit 1
  fi
done
for retired in '^  autoheal:$' '^  cadvisor:$'; do
  if grep -qE "$retired" "$COMPOSE"; then
    echo "FAIL: retired host-privileged service remains: $retired" >&2
    exit 1
  fi
done
echo "host privilege Compose gate OK"
