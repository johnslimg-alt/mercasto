#!/usr/bin/env bash
set -euo pipefail
COMPOSE="docker-compose.yml"
SESSION="backend/config/session.php"
ENV_PROD="backend/.env.production.example"
READINESS="scripts/production-env-readiness-smoke.sh"
ENV_WORKFLOW=".github/workflows/env-readiness.yml"
DOC="docs/production-runtime-security.md"

echo "== Runtime host privilege and session gate =="
if grep -qE '^  autoheal:' "$COMPOSE"; then
  echo "FAIL: autoheal service must not regain Docker host control" >&2; exit 1
fi
if grep -qF '/var/run/docker.sock' "$COMPOSE"; then
  echo "FAIL: production containers must not mount the Docker socket" >&2; exit 1
fi
if grep -qE '^[[:space:]]*-[[:space:]]+/:.*' "$COMPOSE"; then
  echo "FAIL: production containers must not mount the whole host root" >&2; exit 1
fi
if grep -qE '^  cadvisor:' "$COMPOSE"; then
  echo "FAIL: cAdvisor host-access profile must stay removed" >&2; exit 1
fi
grep -qF "env('SESSION_ENCRYPT', env('APP_ENV', 'production') === 'production')" "$SESSION"
grep -qF 'SESSION_ENCRYPT=true' "$ENV_PROD"
grep -qF 'SESSION_ENCRYPT must be true when explicitly set' "$READINESS"
grep -qF 'ENV_READINESS_CONTAINER=mercasto_backend_container' "$ENV_WORKFLOW"
grep -qF 'docker exec -i -e ENV_FILE=/var/www/.env' "$ENV_WORKFLOW"
grep -qF 'bash -s < scripts/production-env-readiness-smoke.sh' "$ENV_WORKFLOW"
! grep -qE 'sudo .*production-env-readiness-smoke' "$ENV_WORKFLOW"
[[ $(grep -c 'command: php artisan queue:work' "$COMPOSE") -eq 2 ]]
[[ $(grep -c 'memory: 1G' "$COMPOSE") -ge 2 ]]
grep -qF '25% of host RAM' "$DOC"
echo "runtime host privilege and session gate OK"
