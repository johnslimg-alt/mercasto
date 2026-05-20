#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-backend/.env}"
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" "${COMPOSE_FILES[@]}")
BASE_URL="${BASE_URL:-https://mercasto.com}"
USER_ID="${BUSINESS_PROFILE_USER_ID:-1}"
TMP_FILE="${TMPDIR:-/tmp}/mercasto-business-profile-smoke.json"

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

url="${BASE_URL%/}/api/users/${USER_ID}/business-profile"
code="$(curl -k -sS --max-time 20 -o "$TMP_FILE" -w '%{http_code}' "$url" || true)"
echo "$url -> $code"

case "$code" in
  200|404)
    python3 -m json.tool "$TMP_FILE" >/dev/null
    ;;
  *)
    echo "FAIL: business profile endpoint returned HTTP $code" >&2
    head -c 1200 "$TMP_FILE" >&2 || true
    echo >&2
    exit 1
    ;;
esac

if grep -Fq '<html' "$TMP_FILE"; then
  echo "FAIL: business profile endpoint returned HTML instead of JSON" >&2
  exit 1
fi

echo "business profile smoke OK"
