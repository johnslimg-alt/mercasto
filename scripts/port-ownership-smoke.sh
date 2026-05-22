#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
EXPECTED_FRONTEND="${EXPECTED_FRONTEND_CONTAINER:-mercasto_frontend_container}"
REQUIRE_PORT_OWNERSHIP="${REQUIRE_PORT_OWNERSHIP:-0}"
PROD_ROOT="${PROD_ROOT:-/var/www/mercasto}"

echo "== Port ownership smoke =="

# This is a live-server gate. Keep local CI and non-production smoke jobs from
# failing when Docker or the production containers are intentionally absent.
if [[ "$REQUIRE_PORT_OWNERSHIP" != "1" && "$(pwd)" != "$PROD_ROOT" ]]; then
  echo "port ownership smoke skipped outside production root: $(pwd)"
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  if [[ "$REQUIRE_PORT_OWNERSHIP" == "1" ]]; then
    echo "FAIL: docker is required for port ownership smoke" >&2
    exit 1
  fi
  echo "port ownership smoke skipped: docker not available"
  exit 0
fi

if ! command -v ss >/dev/null 2>&1; then
  if [[ "$REQUIRE_PORT_OWNERSHIP" == "1" ]]; then
    echo "FAIL: ss is required for port ownership smoke" >&2
    exit 1
  fi
  echo "port ownership smoke skipped: ss not available"
  exit 0
fi

owners="$(ss -ltnp '( sport = :80 or sport = :443 )' || true)"
echo "$owners"

if echo "$owners" | grep -qi 'traefik'; then
  echo "FAIL: Traefik owns port 80/443. Mercasto frontend is expected to publish these ports directly." >&2
  docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}' | grep -i traefik >&2 || true
  exit 1
fi

if ! docker ps --format '{{.Names}} {{.Ports}}' | grep -F "$EXPECTED_FRONTEND" | grep -qE '0\.0\.0\.0:80->80/tcp|\[::\]:80->80/tcp'; then
  echo "FAIL: $EXPECTED_FRONTEND is not publishing port 80." >&2
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}' >&2
  exit 1
fi

if ! docker ps --format '{{.Names}} {{.Ports}}' | grep -F "$EXPECTED_FRONTEND" | grep -qE '0\.0\.0\.0:443->443/tcp|\[::\]:443->443/tcp'; then
  echo "FAIL: $EXPECTED_FRONTEND is not publishing port 443." >&2
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}' >&2
  exit 1
fi

code="$(curl -k -sS --retry 3 --retry-delay 3 --retry-connrefused --max-time 20 -o /dev/null -w '%{http_code}' "${BASE_URL%/}/up" || true)"
echo "${BASE_URL%/}/up -> $code"

if [[ "$code" != "200" ]]; then
  echo "FAIL: Mercasto health endpoint is not reachable through the public HTTPS frontend." >&2
  exit 1
fi

echo "port ownership smoke OK"
