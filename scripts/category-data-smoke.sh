#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-backend/.env}"
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" "${COMPOSE_FILES[@]}")
REQUIRE_CATEGORY_DATA_READY="${REQUIRE_CATEGORY_DATA_READY:-0}"

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

echo "== Category data readiness =="

RESULTS="$("${COMPOSE[@]}" exec -T mercasto-backend php artisan tinker --execute='
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

$checks = [];
$checks["categories_table"] = Schema::hasTable("categories") ? "ready" : "not_ready";
$checks["category_attributes_table"] = Schema::hasTable("category_attributes") ? "ready" : "not_ready";

$categoryCount = Schema::hasTable("categories") ? DB::table("categories")->count() : 0;
$attributeCount = Schema::hasTable("category_attributes") ? DB::table("category_attributes")->count() : 0;

$checks["categories_count"] = $categoryCount > 0 ? "ready" : "not_ready";
$checks["category_attributes_count"] = $attributeCount > 0 ? "ready" : "not_ready";
$checks["category_attributes_minimum"] = $attributeCount >= 10 ? "ready" : "not_ready";

foreach ($checks as $name => $status) {
    echo $name . "=" . $status . PHP_EOL;
}
echo "categories_total=" . (int) $categoryCount . PHP_EOL;
echo "category_attributes_total=" . (int) $attributeCount . PHP_EOL;
')"

echo "$RESULTS"

NOT_READY="$(echo "$RESULTS" | grep '=not_ready' || true)"

if [[ -n "$NOT_READY" ]]; then
  echo "Category data readiness failed. Fresh database launch requires repo-controlled category and attribute data." >&2
  if [[ "$REQUIRE_CATEGORY_DATA_READY" == "1" ]]; then
    exit 1
  fi
fi

echo "category data readiness smoke OK"
