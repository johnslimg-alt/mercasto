#!/usr/bin/env bash
set -euo pipefail

echo "== Self-hosted runtime alert contract gate =="

grep -qF 'bugsink/bugsink:2.5.1@sha256:ecdd845877464d70d61244b8adba20d623e1860e88d8338f2808d9cc2925745c' docker-compose.yml
grep -qF 'BASE_URL=https://mercasto.com/ops/errors' docker-compose.yml
grep -qF 'ALLOWED_HOSTS=mercasto.com,localhost,127.0.0.1' docker-compose.yml
grep -qF 'USER_REGISTRATION=CB_NOBODY' docker-compose.yml
grep -qF 'TEAM_CREATION=CB_NOBODY' docker-compose.yml
grep -qF 'PHONEHOME=False' docker-compose.yml
grep -qF 'EMAIL_BACKEND=bugsink.email_backends.QuietConsoleEmailBackend' docker-compose.yml
grep -qF 'ALERTS_WEBHOOK_OUTBOUND_MODE=allowlist_only' docker-compose.yml
grep -qF 'ALERTS_WEBHOOK_ALLOW_LIST=mercasto-frontend' docker-compose.yml
grep -qF 'ALERTS_WEBHOOK_DENY_NON_GLOBAL=False' docker-compose.yml
grep -qF 'BUGSINK_ALERT_TOKEN' docker-compose.yml
grep -qF 'bugsink_data:/data' docker-compose.yml

if grep -qE 'BUGSINK_EMAIL_HOST|BUGSINK_EMAIL_HOST_PASSWORD|BUGSINK_DEFAULT_FROM_EMAIL' docker-compose.yml; then
  echo "FAIL: Bugsink must not receive Laravel SMTP credentials" >&2
  exit 1
fi
grep -qF 'location ^~ /ops/errors/' default.conf
grep -qF 'set $bugsink_upstream "bugsink:8000";' default.conf
grep -qF 'rewrite ^/ops/errors/(.*)$ /$1 break;' default.conf
grep -qF 'listen 8081;' default.conf
grep -qF 'location = /api/internal/runtime-alerts' default.conf
grep -qF 'fastcgi_pass mercasto-backend:9000;' default.conf
grep -qF 'rewrite ^ /index.php last;' default.conf
grep -qF 'location = /index.php {' default.conf
grep -qF 'internal;' default.conf
grep -qF 'fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;' default.conf
grep -qF 'return 404;' default.conf
grep -qF 'http://mercasto-frontend:8081/api/internal/runtime-alerts?token=' scripts/bugsink-bootstrap.sh
grep -qF 'access_log off;' default.conf

grep -qF "Route::post('/internal/runtime-alerts', RuntimeErrorAlertController::class);" backend/routes/api.php
grep -qF "hash_equals(\$expectedToken, \$providedToken)" backend/app/Http/Controllers/Api/RuntimeErrorAlertController.php
grep -qF "runtime error alert mail delivery failed" backend/app/Http/Controllers/Api/RuntimeErrorAlertController.php
grep -qF 'RAW-SECRET-MUST-NOT-BE-EMAILED' backend/tests/Feature/RuntimeErrorAlertEndpointTest.php
grep -qF 'SENTRY_LARAVEL_DSN' scripts/production-env-readiness-smoke.sh
grep -qF 'php artisan sentry:test' scripts/bugsink-bootstrap.sh
grep -qF 'Bugsink alert did not complete Laravel mail delivery' scripts/bugsink-bootstrap.sh

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
cat > "$tmpdir/backend.env" <<'EOF'
ADMIN_EMAIL=ops@example.test
MAIL_PASSWORD=must-not-cross-boundary
EOF
: > "$tmpdir/compose.env"
python3 scripts/bugsink-compose-env-sync.py "$tmpdir/backend.env" "$tmpdir/compose.env" >/dev/null
bash scripts/bugsink-compose-env-readiness.sh "$tmpdir/compose.env" >/dev/null
first_token="$(sed -n 's/^BUGSINK_ALERT_TOKEN=//p' "$tmpdir/compose.env")"
backend_token="$(sed -n 's/^BUGSINK_ALERT_TOKEN=//p' "$tmpdir/backend.env")"
[ -n "$first_token" ] && [ "$first_token" = "$backend_token" ]
if grep -qF 'must-not-cross-boundary' "$tmpdir/compose.env"; then
  echo "FAIL: backend mail secret crossed into Bugsink Compose env" >&2
  exit 1
fi
python3 scripts/bugsink-compose-env-sync.py "$tmpdir/backend.env" "$tmpdir/compose.env" >/dev/null
second_token="$(sed -n 's/^BUGSINK_ALERT_TOKEN=//p' "$tmpdir/compose.env")"
[ "$first_token" = "$second_token" ] || {
  echo "FAIL: Bugsink alert token rotated unexpectedly" >&2
  exit 1
}

DB_PASSWORD=ci REDIS_PASSWORD=ci GRAFANA_PASSWORD=ci \
  docker compose config --format json | python3 -c '
import json, sys
service = json.load(sys.stdin)["services"]["bugsink"]
if service.get("ports"):
    raise SystemExit("Bugsink must not publish a host port")
if "healthcheck" in service:
    raise SystemExit("Bugsink must use the image-provided healthcheck")
if "8000" not in {str(v) for v in service.get("expose", [])}:
    raise SystemExit("Bugsink internal HTTP port is missing")
'

echo "self-hosted runtime alert contract gate OK"
