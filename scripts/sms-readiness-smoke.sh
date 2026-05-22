#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-backend/.env}"
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" "${COMPOSE_FILES[@]}")
REQUIRE_SMS_READY="${REQUIRE_SMS_READY:-0}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

require_cmd docker

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "missing compose env file: $COMPOSE_ENV_FILE" >&2
  exit 1
fi

echo "== SMS provider readiness =="

SMS_READY="$("${COMPOSE[@]}" exec -T mercasto-backend php artisan tinker --execute='
$sid = trim((string) config("services.twilio.sid"));
$token = trim((string) config("services.twilio.token"));
$from = trim((string) config("services.twilio.from"));
$placeholderFrom = in_array($from, ["+15005550006", "15005550006"], true);
$placeholderSid = $sid === "" || preg_match("/^(test|changeme|placeholder|dummy)$/i", $sid);
$placeholderToken = $token === "" || preg_match("/^(test|changeme|placeholder|dummy)$/i", $token);
echo (!$placeholderSid && !$placeholderToken && !$placeholderFrom && $from !== "") ? "ready" : "not_ready";
')"

echo "sms_provider=$SMS_READY"

if [[ "$SMS_READY" != "ready" ]]; then
  echo "SMS OTP provider is not configured with production-safe values. Phone verification endpoints should remain unavailable and launch should stay blocked when REQUIRE_SMS_READY=1." >&2
  if [[ "$REQUIRE_SMS_READY" == "1" ]]; then
    exit 1
  fi
fi

echo "sms readiness smoke OK"
