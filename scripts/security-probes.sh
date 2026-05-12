#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
PUBLIC_IP="${PUBLIC_IP:-72.62.173.145}"

check_denied() {
  local url="$1"
  local status
  status="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 15 "$url")"
  echo "$url -> $status"
  case "$status" in
    403|404|410) return 0 ;;
    *) echo "unsafe or unexpected response for $url: $status" >&2; exit 1 ;;
  esac
}

check_closed() {
  local url="$1"
  echo "checking $url"
  if curl -m 5 -sS "$url" >/tmp/mercasto_probe.out 2>/tmp/mercasto_probe.err; then
    echo "unexpectedly reachable: $url" >&2
    cat /tmp/mercasto_probe.out >&2 || true
    exit 1
  fi
  echo "$url -> closed or unreachable"
}

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }

echo "== Sensitive HTTP paths =="
for path in \
  "/.env" \
  "/.env.backup" \
  "/.env.bak" \
  "/.env.example" \
  "/.git/config" \
  "/.git/HEAD" \
  "/.git/index" \
  "/backend/.env" \
  "/storage/../.env" \
  "/storage/logs/laravel.log" \
  "/composer.json" \
  "/composer.lock" \
  "/package.json" \
  "/package-lock.json" \
  "/vendor/autoload.php" \
  "/horizon" \
  "/vendor/horizon"
do
  check_denied "${BASE_URL}${path}"
done

echo "== Public internal-service ports =="
check_closed "http://${PUBLIC_IP}:11434/api/tags"
check_closed "http://${PUBLIC_IP}:6379"
check_closed "http://${PUBLIC_IP}:5432"
check_closed "http://${PUBLIC_IP}:9090"
check_closed "http://${PUBLIC_IP}:8080"

echo "security probes OK"
