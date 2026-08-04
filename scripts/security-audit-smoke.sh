#!/usr/bin/env bash
set -euo pipefail

BACKEND_CONTAINER="${BACKEND_CONTAINER:-mercasto_backend_container}"
BASE_URL="${BASE_URL:-https://mercasto.com}"

echo "== Security audit logging smoke =="

runtime="$(docker exec "$BACKEND_CONTAINER" php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
echo json_encode(config("logging.channels.security"));
')"

python3 - "$runtime" <<'PY'
import json
import sys

cfg = json.loads(sys.argv[1])
assert cfg['driver'] == 'daily', cfg
assert cfg['level'] == 'warning', cfg
assert int(cfg['days']) >= 30, cfg
assert int(cfg['permission']) == 416, cfg  # PHP 0640 in decimal
print('security log channel config OK')
PY

count_events() {
  docker exec "$BACKEND_CONTAINER" sh -lc \
    "grep -h -c '\"event\":\"authentication_required\"' storage/logs/security*.log 2>/dev/null | awk '{s+=\$1} END {print s+0}'"
}

before="$(count_events)"
status="$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 20 "$BASE_URL/api/user")"
test "$status" = "401"

after="$before"
for _ in 1 2 3 4 5; do
  sleep 1
  after="$(count_events)"
  [[ "$after" -gt "$before" ]] && break
done

if [[ "$after" -le "$before" ]]; then
  echo "security audit event was not written" >&2
  exit 1
fi

latest="$(docker exec "$BACKEND_CONTAINER" sh -lc \
  "grep -h '\"event\":\"authentication_required\"' storage/logs/security*.log 2>/dev/null | tail -1")"

grep -qF '"status":401' <<<"$latest"
grep -qF '"route":"api/user"' <<<"$latest"
for forbidden in '"password"' '"token"' '"authorization"' '"cookie"' '"request_body"'; do
  if grep -qF "$forbidden" <<<"$latest"; then
    echo "forbidden field found in security audit log: $forbidden" >&2
    exit 1
  fi
done

echo "security audit logging smoke OK"
