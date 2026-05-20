#!/usr/bin/env bash
set -euo pipefail

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-backend/.env}"
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" "${COMPOSE_FILES[@]}")

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "missing compose env file: $COMPOSE_ENV_FILE" >&2
  exit 1
fi

echo "== Billing readiness smoke =="

"${COMPOSE[@]}" exec -T mercasto-backend php -l app/Http/Controllers/Api/PaymentController.php
"${COMPOSE[@]}" exec -T mercasto-backend php artisan route:list --path=webhooks/clip | grep -q "webhooks/clip"
"${COMPOSE[@]}" exec -T mercasto-backend php artisan route:list --path=payment | grep -q "payment/clip"

"${COMPOSE[@]}" exec -T mercasto-backend php -r '
$payload = "{\"reference\":\"clip_test_reference\",\"status\":\"paid\"}";
$secret = "local_test_webhook_secret";
$expected = hash_hmac("sha256", $payload, $secret);
$prefixed = "sha256=" . $expected;
$received = str_starts_with($prefixed, "sha256=") ? substr($prefixed, 7) : $prefixed;
if (! hash_equals($expected, $received)) {
    fwrite(STDERR, "HMAC sanity check failed\n");
    exit(1);
}
echo "HMAC sanity OK\n";
'

# Live endpoint must not accept unsigned callbacks. HTTP 401 is expected when the app is configured.
# HTTP 503 is also acceptable because it means the endpoint fails closed while launch env is incomplete.
TMP_FILE="${TMPDIR:-/tmp}/mercasto-billing-readiness-smoke.json"
BASE_URL="${BASE_URL:-https://mercasto.com}"
url="${BASE_URL%/}/api/webhooks/clip"
code="$(curl -k -sS --max-time 20 -o "$TMP_FILE" -w '%{http_code}' -X POST "$url" -H 'Content-Type: application/json' --data '{"reference":"clip_smoke","status":"paid"}' || true)"
echo "$url unsigned -> $code"

case "$code" in
  401|503)
    python3 -m json.tool "$TMP_FILE" >/dev/null
    ;;
  *)
    echo "FAIL: unsigned billing callback returned unexpected HTTP $code" >&2
    head -c 1200 "$TMP_FILE" >&2 || true
    echo >&2
    exit 1
    ;;
esac

echo "billing readiness smoke OK"
