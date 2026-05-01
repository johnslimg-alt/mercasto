#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
PUBLIC_IP="${PUBLIC_IP:-72.62.173.145}"
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

check_http_status() {
  local url="$1"
  local expected_pattern="$2"
  local status
  status="$(curl -k -sS -o /dev/null -w '%{http_code}' "$url")"
  echo "$url -> $status"
  if [[ ! "$status" =~ $expected_pattern ]]; then
    echo "unexpected status for $url: $status" >&2
    exit 1
  fi
}

check_public_port_closed() {
  local url="$1"
  echo "checking closed public endpoint: $url"
  if curl -m 5 -sS "$url" >/tmp/mercasto_public_probe.out 2>/tmp/mercasto_public_probe.err; then
    echo "public endpoint unexpectedly reachable: $url" >&2
    cat /tmp/mercasto_public_probe.out >&2 || true
    exit 1
  fi
  echo "$url -> closed or unreachable as expected"
}

require_cmd docker
require_cmd curl

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

if [[ ! -f docker-compose.override.yml ]]; then
  echo "missing docker-compose.override.yml" >&2
  exit 1
fi

echo "== Compose validation =="
docker compose "${COMPOSE_FILES[@]}" config >/tmp/mercasto_compose_config.out

grep -q 'mercasto-scheduler:' /tmp/mercasto_compose_config.out
grep -q 'mercasto-reverb:' /tmp/mercasto_compose_config.out
grep -q 'condition: service_healthy' /tmp/mercasto_compose_config.out

echo "compose config OK"

echo "== Container status =="
docker compose "${COMPOSE_FILES[@]}" ps

echo "== Public HTTP smoke =="
check_http_status "${BASE_URL}/up" '^200$'
check_http_status "${BASE_URL}/" '^(200|301|302)$'
check_http_status "${BASE_URL}/api/categories" '^(200|204|301|302|401|403|404)$'
check_http_status "${BASE_URL}/api/ads?page=1" '^(200|204|301|302|401|403|404)$'

echo "== Sensitive path probes =="
check_http_status "${BASE_URL}/.env" '^(403|404|410)$'
check_http_status "${BASE_URL}/.git/config" '^(403|404|410)$'
check_http_status "${BASE_URL}/backend/.env" '^(403|404|410)$'

echo "== Internal service exposure probes =="
check_public_port_closed "http://${PUBLIC_IP}:11434/api/tags"
check_public_port_closed "http://${PUBLIC_IP}:6379"
check_public_port_closed "http://${PUBLIC_IP}:5432"
check_public_port_closed "http://${PUBLIC_IP}:9090"
check_public_port_closed "http://${PUBLIC_IP}:8080"

echo "== Redis host setting =="
if [[ "$(sysctl -n vm.overcommit_memory 2>/dev/null || echo unknown)" != "1" ]]; then
  echo "vm.overcommit_memory is not 1" >&2
  exit 1
fi

echo "production smoke OK"
