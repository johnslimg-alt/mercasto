#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
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

$legacySlugs = ["coches", "telefonos", "telefonia", "informatica", "bebes", "coleccionismo"];
$canonicalSlugs = ["motor", "electronica", "infantil", "ocio"];

$legacyCategoryCount = Schema::hasTable("categories")
    ? DB::table("categories")->whereIn("slug", $legacySlugs)->count()
    : 0;
$canonicalCategoryCount = Schema::hasTable("categories")
    ? DB::table("categories")->whereIn("slug", $canonicalSlugs)->distinct()->count("slug")
    : 0;
$legacyAdCount = Schema::hasTable("ads")
    ? DB::table("ads")->whereIn("category", $legacySlugs)->count()
    : 0;
$legacySubscriptionCount = Schema::hasTable("category_subscriptions")
    ? DB::table("category_subscriptions")->whereIn("category_slug", $legacySlugs)->count()
    : 0;
$legacyAlertCount = Schema::hasTable("search_alerts")
    ? DB::table("search_alerts")->whereIn("category_slug", $legacySlugs)->count()
    : 0;

$checks["categories_count"] = $categoryCount > 0 ? "ready" : "not_ready";
$checks["category_attributes_count"] = $attributeCount > 0 ? "ready" : "not_ready";
$checks["category_attributes_minimum"] = $attributeCount >= 10 ? "ready" : "not_ready";
$checks["legacy_categories_absent"] = $legacyCategoryCount === 0 ? "ready" : "not_ready";
$checks["canonical_categories_present"] = $canonicalCategoryCount === count($canonicalSlugs) ? "ready" : "not_ready";
$checks["legacy_ads_absent"] = $legacyAdCount === 0 ? "ready" : "not_ready";
$checks["legacy_category_subscriptions_absent"] = $legacySubscriptionCount === 0 ? "ready" : "not_ready";
$checks["legacy_search_alerts_absent"] = $legacyAlertCount === 0 ? "ready" : "not_ready";

foreach ($checks as $name => $status) {
    echo $name . "=" . $status . PHP_EOL;
}
echo "categories_total=" . (int) $categoryCount . PHP_EOL;
echo "category_attributes_total=" . (int) $attributeCount . PHP_EOL;
echo "legacy_categories_total=" . (int) $legacyCategoryCount . PHP_EOL;
echo "canonical_categories_total=" . (int) $canonicalCategoryCount . PHP_EOL;
echo "legacy_ads_total=" . (int) $legacyAdCount . PHP_EOL;
echo "legacy_category_subscriptions_total=" . (int) $legacySubscriptionCount . PHP_EOL;
echo "legacy_search_alerts_total=" . (int) $legacyAlertCount . PHP_EOL;
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
