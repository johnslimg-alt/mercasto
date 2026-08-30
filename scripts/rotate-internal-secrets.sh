#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

[ "${CONFIRM:-}" = "MERCASTO" ] || { echo "confirm=MERCASTO required"; exit 64; }
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"

read_env() {
  python3 - "$1" "$2" <<'PY'
from pathlib import Path
import sys
p, key = Path(sys.argv[1]), sys.argv[2]
for line in p.read_text(errors='ignore').splitlines():
    if not line or line.lstrip().startswith('#') or '=' not in line:
        continue
    k, v = line.split('=', 1)
    if k.strip() == key:
        print(v.strip().strip('"\''))
        break
PY
}

write_pair() {
  FILE="$1" DB_VALUE="$2" REDIS_VALUE="$3" python3 - <<'PY'
from pathlib import Path
import os
p = Path(os.environ['FILE'])
values = {'DB_PASSWORD': os.environ['DB_VALUE'], 'REDIS_PASSWORD': os.environ['REDIS_VALUE']}
lines = p.read_text(errors='ignore').splitlines()
out, seen = [], set()
for line in lines:
    if line and not line.lstrip().startswith('#') and '=' in line:
        key = line.split('=', 1)[0].strip()
        if key in values:
            out.append(f'{key}={values[key]}')
            seen.add(key)
            continue
    out.append(line)
for key, value in values.items():
    if key not in seen:
        out.append(f'{key}={value}')
p.write_text('\n'.join(out) + '\n')
PY
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

check_backend_db() { docker compose exec -T mercasto-backend php /var/www/health-db.php >/dev/null 2>&1; }
check_redis_auth() { docker compose exec -T redis redis-cli -a "$NEW_REDIS" ping 2>/dev/null | grep -qx PONG; }
check_public_url() { curl -fsS --max-time 15 "$1" >/dev/null; }
refresh_config_cache() { docker compose exec -T mercasto-backend php artisan config:cache >/dev/null 2>&1; }
invalidate_config_cache() {
  local cache="$REPO_ROOT/backend/bootstrap/cache/config.php"
  case "$cache" in
    "$REPO_ROOT"/backend/bootstrap/cache/config.php) rm -f -- "$cache" ;;
    *) return 1 ;;
  esac
}

ROOT_ENV=.env
BACKEND_ENV=backend/.env
STEP=backup
DB_USER="$(read_env "$ROOT_ENV" DB_USERNAME || true)"; DB_USER="${DB_USER:-mercasto_user}"
DB_NAME="$(read_env "$ROOT_ENV" DB_DATABASE || true)"; DB_NAME="${DB_NAME:-mercasto}"
OLD_DB="$(read_env "$ROOT_ENV" DB_PASSWORD)"
OLD_REDIS="$(read_env "$ROOT_ENV" REDIS_PASSWORD)"
NEW_DB="$(openssl rand -hex 32)"
NEW_REDIS="$(openssl rand -hex 32)"

test -n "$OLD_DB"; test -n "$OLD_REDIS"
backup="postgres-backups/pre_secret_rotation_$(date -u +%Y%m%d_%H%M%S).dump"
docker compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup"
test -s "$backup"
test "$(stat -c %s "$backup")" -gt 1048576
docker compose exec -T postgres pg_restore -l < "$backup" >/dev/null
sha256sum "$backup" | sed 's#  .*#  [verified-backup]#'

rollback() {
  rc=$?
  trap - ERR
  echo "Internal secret rotation failed at step=${STEP:-unknown}; restoring prior credentials."
  set +e
  write_pair "$ROOT_ENV" "$OLD_DB" "$OLD_REDIS"
  write_pair "$BACKEND_ENV" "$OLD_DB" "$OLD_REDIS"
  invalidate_config_cache >/dev/null 2>&1 || true
  printf 'ALTER ROLE "%s" PASSWORD '\''%s'\'';\n' "$DB_USER" "$OLD_DB" | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1
  docker compose up -d --force-recreate postgres redis db-backup mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb >/dev/null 2>&1
  reload_frontend_upstream >/dev/null 2>&1 || true
  exit "$rc"
}
trap rollback ERR

STEP=database-role-update
printf 'ALTER ROLE "%s" PASSWORD '\''%s'\'';\n' "$DB_USER" "$NEW_DB" | docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" >/dev/null
STEP=env-update
write_pair "$ROOT_ENV" "$NEW_DB" "$NEW_REDIS"
write_pair "$BACKEND_ENV" "$NEW_DB" "$NEW_REDIS"
STEP=config-cache-invalidate
invalidate_config_cache
STEP=container-recreate
docker compose up -d --force-recreate postgres redis db-backup mercasto-backend mercasto-worker mercasto-scheduler mercasto-reverb >/dev/null

STEP=container-health
for _ in $(seq 1 36); do
  db="$(docker inspect -f '{{.State.Health.Status}}' mercasto_db_container 2>/dev/null || echo starting)"
  redis="$(docker inspect -f '{{.State.Health.Status}}' mercasto_redis_container 2>/dev/null || echo starting)"
  backend="$(docker inspect -f '{{.State.Health.Status}}' mercasto_backend_container 2>/dev/null || echo starting)"
  [ "$db" = healthy ] && [ "$redis" = healthy ] && [ "$backend" = healthy ] && break
  sleep 5
done

test "$(docker inspect -f '{{.State.Health.Status}}' mercasto_db_container)" = healthy
test "$(docker inspect -f '{{.State.Health.Status}}' mercasto_redis_container)" = healthy
test "$(docker inspect -f '{{.State.Health.Status}}' mercasto_backend_container)" = healthy
STEP=config-cache-refresh
retry_cmd 6 2 refresh_config_cache
STEP=backend-db
retry_cmd 12 5 check_backend_db
STEP=redis-auth
retry_cmd 6 2 check_redis_auth
STEP=frontend-reload
retry_cmd 10 2 reload_frontend_upstream
STEP=public-categories
retry_cmd 12 5 check_public_url https://mercasto.com/api/categories
STEP=public-home
retry_cmd 12 5 check_public_url https://mercasto.com/

# Remove only plaintext backup copies owned by this Mercasto checkout. Never scan
# or delete generic .env backup files elsewhere under /root or other projects.
find "$REPO_ROOT" -xdev -type f \( -name '.env.backup*' -o -name '.env.bak*' -o -name '*.env.backup*' \) -print -delete 2>/dev/null | sed 's#.*#removed_plaintext_env_backup#'
trap - ERR
unset OLD_DB OLD_REDIS NEW_DB NEW_REDIS

echo "INTERNAL_SECRET_ROTATION=PASS backup=$backup"
