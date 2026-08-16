#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-mercasto_backend_container}"

db_file="$(mktemp)"
api_file="$(mktemp)"
trap 'rm -f "$db_file" "$api_file"' EXIT

echo "== Production state-filter fallback smoke =="

docker exec "$BACKEND_CONTAINER" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Ad;

$locations = Ad::query()
    ->where("status", "active")
    ->where(function ($query): void {
        $query->whereNull("state")->orWhere("state", "");
    })
    ->whereNotNull("location")
    ->where("location", "like", "%,%")
    ->pluck("location");

$segments = [];
foreach ($locations as $location) {
    $parts = explode(",", (string) $location);
    $candidate = trim((string) end($parts));

    if ($candidate === "" || mb_strlen($candidate, "UTF-8") > 80 || ! preg_match("/\\p{L}/u", $candidate)) {
        continue;
    }

    $key = mb_strtolower($candidate, "UTF-8");
    if (! isset($segments[$key])) {
        $segments[$key] = ["label" => $candidate, "count" => 0];
    }
    $segments[$key]["count"]++;
}

uasort($segments, fn (array $a, array $b): int => $b["count"] <=> $a["count"]);
$selected = reset($segments);
if (! is_array($selected) || empty($selected["label"])) {
    fwrite(STDERR, "No active legacy combined-location candidate is available for the state-filter smoke.\n");
    exit(2);
}

$state = $selected["label"];
$locationPattern = "%{$state}%";

$structured = Ad::query()
    ->where("status", "active")
    ->whereRaw("state ILIKE ?", [$state])
    ->count();

$fallbackOnly = Ad::query()
    ->where("status", "active")
    ->where(function ($query) use ($state): void {
        $query->whereNull("state")
            ->orWhereRaw("state NOT ILIKE ?", [$state]);
    })
    ->whereRaw("location ILIKE ?", [$locationPattern])
    ->count();

$expected = Ad::query()
    ->where("status", "active")
    ->where(function ($query) use ($state, $locationPattern): void {
        $query->whereRaw("state ILIKE ?", [$state])
            ->orWhereRaw("location ILIKE ?", [$locationPattern]);
    })
    ->count();

echo json_encode([
    "state" => $state,
    "structured" => $structured,
    "fallback_only" => $fallbackOnly,
    "expected" => $expected,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
' > "$db_file"

read_json_field() {
  php -r '
    $data = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
    $field = $argv[2];
    if (! array_key_exists($field, $data)) {
        fwrite(STDERR, "Missing JSON field: {$field}\n");
        exit(2);
    }
    echo $data[$field];
  ' "$db_file" "$1"
}

state="$(read_json_field state)"
structured="$(read_json_field structured)"
fallback_only="$(read_json_field fallback_only)"
expected="$(read_json_field expected)"

if [ "$fallback_only" -le 0 ]; then
  echo "State-filter smoke cannot prove the legacy fallback: fallback_only=$fallback_only"
  exit 1
fi

if [ "$expected" -le "$structured" ]; then
  echo "State-filter smoke expected total must exceed structured-only total: structured=$structured expected=$expected"
  exit 1
fi

http_code="$(curl -sS --retry 2 --retry-all-errors --max-time 30 \
  --get --data-urlencode "state=$state" \
  -o "$api_file" -w '%{http_code}' \
  "$BASE_URL/api/ads")"

if [ "$http_code" != "200" ]; then
  echo "Public state-filter request returned HTTP $http_code"
  exit 1
fi

api_total="$(php -r '
  $data = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
  if (! isset($data["total"]) || ! is_numeric($data["total"])) {
      fwrite(STDERR, "Public state-filter response is missing numeric total.\n");
      exit(2);
  }
  echo (int) $data["total"];
' "$api_file")"

if [ "$api_total" -ne "$expected" ]; then
  echo "State-filter total mismatch: structured=$structured fallback_only=$fallback_only expected=$expected api_total=$api_total"
  exit 1
fi

echo "state-filter production smoke OK: candidate=$state structured=$structured fallback_only=$fallback_only api_total=$api_total"
