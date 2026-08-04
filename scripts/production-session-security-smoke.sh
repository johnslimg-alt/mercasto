#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-mercasto_backend_container}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "== Production bearer and session security smoke =="

runtime_json="$(docker exec "$BACKEND_CONTAINER" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo json_encode([
  "session_secure" => (bool) config("session.secure"),
  "session_http_only" => (bool) config("session.http_only"),
  "session_same_site" => config("session.same_site"),
  "cors_credentials" => (bool) config("cors.supports_credentials"),
  "cors_origins" => config("cors.allowed_origins"),
], JSON_UNESCAPED_SLASHES);
')"

python3 - "$runtime_json" <<'PY'
import json
import sys

cfg = json.loads(sys.argv[1])
assert cfg["session_secure"] is True, cfg
assert cfg["session_http_only"] is True, cfg
assert cfg["session_same_site"] in {"lax", "strict"}, cfg
assert cfg["cors_credentials"] is False, cfg
assert cfg["cors_origins"] == ["https://mercasto.com"], cfg
print("runtime session/CORS config OK")
PY

curl -ksS -c "$TMP_DIR/cookies" -o /dev/null "$BASE_URL/sanctum/csrf-cookie"
xsrf_cookie="$(awk '$6 == "XSRF-TOKEN" {print $7}' "$TMP_DIR/cookies" | tail -n1)"
xsrf_header="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))' "$xsrf_cookie")"

cookie_status="$(curl -ksS -o "$TMP_DIR/cookie-body" -w '%{http_code}' \
  -X PUT "$BASE_URL/api/user/profile" \
  -b "$TMP_DIR/cookies" \
  -H 'Origin: https://mercasto.com' \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -H "X-XSRF-TOKEN: $xsrf_header" \
  --data '{"name":"Cookie-only request"}')"

printf '%-52s -> %s\n' 'cookie + valid XSRF protected write' "$cookie_status"
test "$cookie_status" = "401"
grep -qF 'Unauthenticated' "$TMP_DIR/cookie-body"

curl -ksS -D "$TMP_DIR/untrusted-headers" -o /dev/null \
  -X OPTIONS "$BASE_URL/api/user/profile" \
  -H 'Origin: https://evil.example' \
  -H 'Access-Control-Request-Method: PUT' \
  -H 'Access-Control-Request-Headers: authorization,content-type'

if grep -Eqi '^access-control-allow-origin:[[:space:]]*https://evil\.example' "$TMP_DIR/untrusted-headers"; then
  echo "untrusted origin was allowed by CORS" >&2
  exit 1
fi

curl -ksS -D "$TMP_DIR/trusted-headers" -o /dev/null \
  -X OPTIONS "$BASE_URL/api/user/profile" \
  -H 'Origin: https://mercasto.com' \
  -H 'Access-Control-Request-Method: PUT' \
  -H 'Access-Control-Request-Headers: authorization,content-type'

grep -Eqi '^access-control-allow-origin:[[:space:]]*https://mercasto\.com' "$TMP_DIR/trusted-headers"
if grep -Eqi '^access-control-allow-credentials:[[:space:]]*true' "$TMP_DIR/trusted-headers"; then
  echo "credentialed cross-origin requests are unexpectedly enabled" >&2
  exit 1
fi

echo "production bearer and session security smoke OK"
