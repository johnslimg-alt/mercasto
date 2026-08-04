#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

NETWORK="${E2E_NETWORK:-mercasto-launch-e2e-net}"
POSTGRES_CONTAINER="${E2E_POSTGRES_CONTAINER:-mercasto-launch-e2e-pg}"
API_CONTAINER="${E2E_API_CONTAINER:-mercasto-launch-e2e-api}"
BACKEND_IMAGE="${E2E_BACKEND_IMAGE:-mercasto-launch-e2e-api:local}"
DB_NAME="${E2E_DB_NAME:-mercasto_launch_e2e}"
DB_PASSWORD="${E2E_DB_PASSWORD:-launch-e2e-pass}"
API_PORT="${E2E_API_PORT:-18000}"
FRONTEND_PORT="${E2E_FRONTEND_PORT:-4173}"
CLIP_PORT="${CLIP_E2E_MOCK_PORT:-18001}"
SELLER_EMAIL="${E2E_SELLER_EMAIL:-seller_e2e@mercasto.com}"
SELLER_PASSWORD="${E2E_SELLER_PASSWORD:-E2eTestPass99!}"
BUYER_EMAIL="${E2E_BUYER_EMAIL:-buyer_e2e@mercasto.com}"
BUYER_PASSWORD="${E2E_BUYER_PASSWORD:-E2eTestPass99!}"
ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-admin_e2e@mercasto.com}"
ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-E2eTestPass99!}"
WEBHOOK_SECRET="${CLIP_WEBHOOK_SECRET:-test-webhook-secret}"
E2E_SUITES="${E2E_SUITES:-auth,ads,payments}"
FRONTEND_PID=""
CLIP_PID=""

cleanup() {
  if [[ -n "$FRONTEND_PID" ]]; then
    pkill -TERM -P "$FRONTEND_PID" >/dev/null 2>&1 || true
    kill "$FRONTEND_PID" >/dev/null 2>&1 || true
  fi
  if [[ -n "$CLIP_PID" ]]; then
    pkill -TERM -P "$CLIP_PID" >/dev/null 2>&1 || true
    kill "$CLIP_PID" >/dev/null 2>&1 || true
  fi
  docker rm -f "$API_CONTAINER" "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

wait_for_url() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 60); do
    if curl -fsS --connect-timeout 2 --max-time 5 "$url" >/dev/null 2>&1; then
      echo "$label ready"
      return 0
    fi
    sleep 1
  done
  echo "$label did not become ready: $url" >&2
  return 1
}

for command in docker node npm npx curl; do
  command -v "$command" >/dev/null || { echo "Missing required command: $command" >&2; exit 1; }
done

cleanup

echo "== Build isolated backend image =="
if [[ "${E2E_REUSE_BACKEND_IMAGE:-0}" != "1" ]] || ! docker image inspect "$BACKEND_IMAGE" >/dev/null 2>&1; then
  docker build -t "$BACKEND_IMAGE" backend
fi

echo "== Start PostgreSQL/pgvector =="
docker network create "$NETWORK" >/dev/null
docker run -d --name "$POSTGRES_CONTAINER" --network "$NETWORK" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB="$DB_NAME" \
  pgvector/pgvector:pg18 >/dev/null
postgres_ready=0
for _ in $(seq 1 120); do
  if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres -d "$DB_NAME" >/dev/null 2>&1; then
    postgres_ready=1
    break
  fi
  sleep 1
done
if [[ "$postgres_ready" != "1" ]]; then
  docker ps -a --filter "name=$POSTGRES_CONTAINER" >&2 || true
  docker logs "$POSTGRES_CONTAINER" >&2 || true
  echo "PostgreSQL/pgvector did not become ready." >&2
  exit 1
fi
docker exec "$POSTGRES_CONTAINER" psql -U postgres -d "$DB_NAME" -c 'CREATE EXTENSION IF NOT EXISTS vector;' >/dev/null

echo "== Start provider-safe Clip mock =="
CLIP_E2E_MOCK_PORT="$CLIP_PORT" node scripts/clip-e2e-mock.mjs > /tmp/mercasto-clip-e2e.log 2>&1 &
CLIP_PID=$!
if ! wait_for_url "http://127.0.0.1:$CLIP_PORT/health" "Clip mock"; then
  cat /tmp/mercasto-clip-e2e.log >&2 || true
  exit 1
fi

common_env=(
  -e APP_ENV=testing
  -e APP_DEBUG=false
  -e APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
  -e APP_URL="http://127.0.0.1:$API_PORT"
  -e FRONTEND_URL="http://127.0.0.1:$FRONTEND_PORT"
  -e DB_CONNECTION=pgsql
  -e DB_HOST="$POSTGRES_CONTAINER"
  -e DB_PORT=5432
  -e DB_DATABASE="$DB_NAME"
  -e DB_USERNAME=postgres
  -e DB_PASSWORD="$DB_PASSWORD"
  -e CACHE_STORE=array
  -e SESSION_DRIVER=array
  -e QUEUE_CONNECTION=sync
  -e MAIL_MAILER=array
  -e LOG_CHANNEL=stderr
  -e BROADCAST_CONNECTION=log
  -e FILESYSTEM_DISK=public
  -e E2E_SELLER_EMAIL="$SELLER_EMAIL"
  -e E2E_SELLER_PASSWORD="$SELLER_PASSWORD"
  -e E2E_BUYER_EMAIL="$BUYER_EMAIL"
  -e E2E_BUYER_PASSWORD="$BUYER_PASSWORD"
  -e E2E_ADMIN_EMAIL="$ADMIN_EMAIL"
  -e E2E_ADMIN_PASSWORD="$ADMIN_PASSWORD"
  -e CLIP_WEBHOOK_SECRET="$WEBHOOK_SECRET"
  -e CLIP_API_KEY=test-api-key
  -e CLIP_API_SECRET=test-api-secret
  -e CLIP_CHECKOUT_URL="http://host.docker.internal:$CLIP_PORT/v2/checkout"
  -e CLIP_VERIFICATION_URL="http://host.docker.internal:$CLIP_PORT/v2/checkout"
)

echo "== Migrate and seed isolated database =="
docker run --rm --network "$NETWORK" "${common_env[@]}" "$BACKEND_IMAGE" php artisan migrate:fresh --force
docker run --rm --network "$NETWORK" "${common_env[@]}" "$BACKEND_IMAGE" php artisan db:seed --class=MercastoCategoriesSeeder --force
docker run --rm --network "$NETWORK" "${common_env[@]}" "$BACKEND_IMAGE" php artisan db:seed --class=CategoryAttributeSeeder --force
docker run --rm --network "$NETWORK" "${common_env[@]}" "$BACKEND_IMAGE" php artisan db:seed --class=E2eTestSeeder --force

echo "== Start isolated API =="
docker run -d --name "$API_CONTAINER" --network "$NETWORK" --add-host=host.docker.internal:host-gateway \
  -p "$API_PORT:8000" "${common_env[@]}" "$BACKEND_IMAGE" \
  sh -lc 'php artisan storage:link >/dev/null 2>&1 || true; exec php artisan serve --host=0.0.0.0 --port=8000' >/dev/null
if ! wait_for_url "http://127.0.0.1:$API_PORT/up" "Laravel API"; then
  docker ps -a --filter "name=$API_CONTAINER" >&2 || true
  docker logs "$API_CONTAINER" >&2 || true
  exit 1
fi

echo "== Start isolated frontend =="
VITE_API_BASE_URL="http://127.0.0.1:$API_PORT/api" \
VITE_STORAGE_URL="http://127.0.0.1:$API_PORT/storage" \
npm run dev -- --host 127.0.0.1 --port "$FRONTEND_PORT" > /tmp/mercasto-frontend-e2e.log 2>&1 &
FRONTEND_PID=$!
if ! wait_for_url "http://127.0.0.1:$FRONTEND_PORT" "Vite frontend"; then
  cat /tmp/mercasto-frontend-e2e.log >&2 || true
  exit 1
fi

npx playwright install chromium

suite_enabled() {
  [[ ",$E2E_SUITES," == *",$1,"* ]]
}

base_env=(
  E2E_ISOLATED_STACK=1
  BASE_URL="http://127.0.0.1:$FRONTEND_PORT"
  API_BASE_URL="http://127.0.0.1:$API_PORT/api"
  E2E_SELLER_EMAIL="$SELLER_EMAIL"
  E2E_SELLER_PASSWORD="$SELLER_PASSWORD"
  E2E_BUYER_EMAIL="$BUYER_EMAIL"
  E2E_BUYER_PASSWORD="$BUYER_PASSWORD"
  E2E_ADMIN_EMAIL="$ADMIN_EMAIL"
  E2E_ADMIN_PASSWORD="$ADMIN_PASSWORD"
  CLIP_WEBHOOK_SECRET="$WEBHOOK_SECRET"
  CI=1
)

if suite_enabled auth; then
  echo "== Auth/account E2E =="
  env "${base_env[@]}" npx playwright test tests/e2e/auth-flow.spec.js --workers=1 --retries=0
fi

if suite_enabled ads; then
  echo "== Ads lifecycle E2E =="
  env "${base_env[@]}" npx playwright test tests/e2e/ads-lifecycle.spec.js --workers=1 --retries=0
fi

if suite_enabled payments; then
  # Reset deterministic plans, payments and lifecycle fixtures before billing E2E.
  docker exec \
    -e E2E_SELLER_EMAIL="$SELLER_EMAIL" \
    -e E2E_SELLER_PASSWORD="$SELLER_PASSWORD" \
    -e E2E_BUYER_EMAIL="$BUYER_EMAIL" \
    -e E2E_BUYER_PASSWORD="$BUYER_PASSWORD" \
    -e E2E_ADMIN_EMAIL="$ADMIN_EMAIL" \
    -e E2E_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    "$API_CONTAINER" php artisan db:seed --class=E2eTestSeeder --force

  echo "== Payments/webhook E2E =="
  env "${base_env[@]}" npx playwright test tests/e2e/payments.spec.js --workers=1 --retries=0
fi

echo "isolated launch E2E OK suites=$E2E_SUITES"
