#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-backend/.env}"
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" "${COMPOSE_FILES[@]}")

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "missing compose env file: $COMPOSE_ENV_FILE" >&2
  exit 1
fi

echo "== Business profile smoke =="

"${COMPOSE[@]}" exec -T mercasto-backend php -l app/Http/Controllers/Api/BusinessProfileController.php
"${COMPOSE[@]}" exec -T mercasto-backend php -l app/Models/User.php
"${COMPOSE[@]}" exec -T mercasto-backend php -l database/migrations/2026_05_19_180000_add_business_profile_fields_to_users_table.php

"${COMPOSE[@]}" exec -T mercasto-backend php artisan route:list --path=business-profile | grep -q "business-profile"
"${COMPOSE[@]}" exec -T mercasto-backend php artisan migrate --pretend --no-interaction >/tmp/mercasto-business-profile-migrate-pretend.out

echo "business profile smoke OK"
