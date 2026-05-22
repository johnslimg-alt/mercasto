#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-backend/.env}"
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" "${COMPOSE_FILES[@]}")
REQUIRE_ENV_READY="${REQUIRE_ENV_READY:-0}"

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

echo "== Launch env readiness =="

RESULTS="$("${COMPOSE[@]}" exec -T mercasto-backend php artisan tinker --execute='
$checks = [
    "app_key" => (string) config("app.key"),
    "app_url" => (string) config("app.url"),
    "db_connection" => (string) config("database.default"),
    "redis_client" => (string) config("database.redis.client"),
    "mail_mailer" => (string) config("mail.default"),
    "clip_api_key" => (string) config("services.clip.api_key"),
    "clip_api_secret" => (string) config("services.clip.api_secret"),
    "clip_webhook_secret" => (string) config("services.clip.webhook_secret"),
    "google_client_id" => (string) config("services.google.client_id"),
    "google_client_secret" => (string) config("services.google.client_secret"),
    "google_maps_api_key" => (string) config("services.google.maps_api_key"),
    "deepseek_api_key" => (string) config("services.deepseek.api_key"),
    "ollama_base_url" => (string) config("services.ollama.base_url"),
];
$placeholderPattern = "/^(|test|changeme|change_me|placeholder|dummy|null|none|your_|xxx|example)$/i";
foreach ($checks as $name => $value) {
    $value = trim($value);
    $ok = $value !== "" && !preg_match($placeholderPattern, $value);
    if ($name === "app_key") {
        $ok = str_starts_with($value, "base64:") && strlen($value) > 40;
    }
    if ($name === "app_url") {
        $ok = $value === "https://mercasto.com" || $value === "https://www.mercasto.com";
    }
    echo $name . "=" . ($ok ? "ready" : "not_ready") . PHP_EOL;
}
')"

echo "$RESULTS"

NOT_READY="$(echo "$RESULTS" | grep '=not_ready' || true)"

if [[ -n "$NOT_READY" ]]; then
  echo "Launch env readiness has missing or placeholder critical config." >&2
  if [[ "$REQUIRE_ENV_READY" == "1" ]]; then
    exit 1
  fi
fi

echo "launch env readiness smoke OK"
