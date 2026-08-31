#!/usr/bin/env bash
set -euo pipefail

[[ "${CONFIRM:-}" == "MERCASTO" ]] || { echo 'CONFIRM=MERCASTO required' >&2; exit 64; }
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
[[ "$(git rev-parse HEAD)" == "$(git rev-parse origin/main)" ]] || { echo 'checkout is not exact origin/main' >&2; exit 65; }
[[ -z "$(git status --porcelain)" ]] || { echo 'checkout is dirty' >&2; exit 66; }

strip_key() {
  local target="$1"
  [[ -f "$target" ]] || return 0
  local tmp owner group mode
  tmp="$(mktemp "${target}.osm-clean.XXXXXX")"
  owner="$(stat -c '%u' "$target")"
  group="$(stat -c '%g' "$target")"
  mode="$(stat -c '%a' "$target")"
  awk '!/^(GOOGLE_MAPS_API_KEY|VITE_GOOGLE_MAPS_API_KEY)=/' "$target" > "$tmp"
  chown "$owner:$group" "$tmp"
  chmod "$mode" "$tmp"
  mv "$tmp" "$target"
}

reload_frontend_upstream() {
  docker compose exec -T mercasto-frontend nginx -t >/dev/null
  docker compose exec -T mercasto-frontend nginx -s reload >/dev/null
}

retry_cmd() {
  local attempts="$1" delay="$2" i=1
  shift 2
  while [ "$i" -le "$attempts" ]; do
    if "$@"; then return 0; fi
    [ "$i" -ge "$attempts" ] && break
    sleep "$delay"
    i=$((i + 1))
  done
  return 1
}

check_public_url() { curl -fsS --max-time 15 "$1" >/dev/null; }

strip_key "$REPO_ROOT/.env"
strip_key "$REPO_ROOT/backend/.env"
rm -f "$REPO_ROOT/backend/bootstrap/cache/config.php"
docker compose exec -T mercasto-backend php artisan config:cache >/dev/null

docker compose restart mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb >/dev/null
for _ in $(seq 1 60); do
  if docker inspect --format '{{.State.Health.Status}}' mercasto_backend_container 2>/dev/null | grep -qx healthy; then break; fi
  sleep 2
done
[[ "$(docker inspect --format '{{.State.Health.Status}}' mercasto_backend_container)" == healthy ]]

retry_cmd 10 2 reload_frontend_upstream

docker compose exec -T mercasto-backend php artisan tinker --execute='if (config("services.google.maps_api_key") !== null) { exit(2); }' >/dev/null
! grep -Eq '^(GOOGLE_MAPS_API_KEY|VITE_GOOGLE_MAPS_API_KEY)=' "$REPO_ROOT/.env" "$REPO_ROOT/backend/.env" 2>/dev/null
retry_cmd 12 5 check_public_url https://mercasto.com/api/categories
retry_cmd 12 5 check_public_url https://mercasto.com/
retry_cmd 12 5 check_public_url https://mercasto.com/api/auth/providers

echo 'OSM_ONLY_MAP_PROVIDER=PASS'
