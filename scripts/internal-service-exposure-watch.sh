#!/usr/bin/env bash
set -euo pipefail

INTERNAL_PORTS_REGEX=':(11434|6379|5432|9090|8080)$'

echo "== Internal service exposure watch =="

command -v ss >/dev/null || { echo "FAIL: ss is required" >&2; exit 2; }
command -v docker >/dev/null || { echo "FAIL: docker is required" >&2; exit 2; }

bad_listeners="$(ss -H -ltn | awk '$4 ~ /:(11434|6379|5432|9090|8080)$/ && $4 !~ /^127[.]0[.]0[.]1:/ && $4 !~ /^\[::1\]:/ {print}')"
if [[ -n "$bad_listeners" ]]; then
  echo "FAIL: internal service port is listening beyond loopback" >&2
  printf '%s\n' "$bad_listeners" >&2
  exit 1
fi

host_network="$(for id in $(docker ps -q); do docker inspect -f '{{.Name}} {{.HostConfig.NetworkMode}}' "$id"; done | awk '$2 == "host" {print}')"
if [[ -n "$host_network" ]]; then
  echo "FAIL: running Docker container uses host networking" >&2
  printf '%s\n' "$host_network" >&2
  exit 1
fi

published="$(docker ps --format '{{.Names}} {{.Ports}}' | grep -E '(^|[ ,])(0[.]0[.]0[.]0|\[::\]):(11434|6379|5432|9090|8080)->' || true)"
if [[ -n "$published" ]]; then
  echo "FAIL: internal service port is published on a wildcard address" >&2
  printf '%s\n' "$published" >&2
  exit 1
fi

echo "internal_service_exposure=none"
echo "Internal service exposure watch OK"
