#!/usr/bin/env bash
set -euo pipefail

COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
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

webhook_routes="$("${COMPOSE[@]}" exec -T mercasto-backend php artisan route:list --path=webhooks/clip)"
grep -q "webhooks/clip" <<<"$webhook_routes"

payment_routes="$("${COMPOSE[@]}" exec -T mercasto-backend php artisan route:list --path=payment)"
grep -q "payment/clip" <<<"$payment_routes"

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

# Clip Checkout webhooks may be unsigned. Unknown references must be acknowledged
# without mutating payment state, while a forged optional signature must fail closed.
BASE_URL="${BASE_URL:-https://mercasto.com}"
url="${BASE_URL%/}/api/webhooks/clip"
TMP_UNSIGNED="$(mktemp "${TMPDIR:-/tmp}/mercasto-billing-unsigned.XXXXXX.json")"
TMP_FORGED="$(mktemp "${TMPDIR:-/tmp}/mercasto-billing-forged.XXXXXX.json")"
trap 'rm -f "$TMP_UNSIGNED" "$TMP_FORGED"' EXIT

payload='{"reference":"clip_smoke_readiness_unknown","status":"paid"}'

unsigned_code="$(curl -k -sS --max-time 20 -o "$TMP_UNSIGNED" -w '%{http_code}' -X POST "$url" -H 'Content-Type: application/json' --data "$payload" || true)"
echo "$url unsigned unknown reference -> $unsigned_code"

if [[ "$unsigned_code" != "200" ]]; then
  echo "FAIL: unsigned unknown Clip callback returned unexpected HTTP $unsigned_code" >&2
  head -c 1200 "$TMP_UNSIGNED" >&2 || true
  echo >&2
  exit 1
fi

python3 - "$TMP_UNSIGNED" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as fh:
    payload = json.load(fh)
if payload.get('status') != 'received':
    raise SystemExit(f"unexpected unsigned webhook status: {payload!r}")
PY

forged_code="$(curl -k -sS --max-time 20 -o "$TMP_FORGED" -w '%{http_code}' -X POST "$url" -H 'Content-Type: application/json' -H 'X-Clip-Signature: sha256=invalid_billing_readiness_signature' --data "$payload" || true)"
echo "$url forged optional signature -> $forged_code"

case "$forged_code" in
  401)
    python3 - "$TMP_FORGED" <<'PY'
import json
import sys
with open(sys.argv[1], encoding='utf-8') as fh:
    payload = json.load(fh)
if payload.get('status') != 'invalid_signature':
    raise SystemExit(f"unexpected forged-signature webhook status: {payload!r}")
PY
    ;;
  503)
    # Missing webhook-secret configuration still fails closed.
    python3 -m json.tool "$TMP_FORGED" >/dev/null
    ;;
  *)
    echo "FAIL: forged Clip signature returned unexpected HTTP $forged_code" >&2
    head -c 1200 "$TMP_FORGED" >&2 || true
    echo >&2
    exit 1
    ;;
esac

echo "billing readiness smoke OK"
