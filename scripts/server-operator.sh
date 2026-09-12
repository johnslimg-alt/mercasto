#!/usr/bin/env bash
set -euo pipefail

OPERATION="${OPERATION:-${1:-status}}"
CONFIRM="${CONFIRM:-${2:-}}"
TAIL_LINES="${TAIL_LINES:-160}"
PROJECT_DIR="${PROJECT_DIR:-}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"

case "$TAIL_LINES" in
  ''|*[!0-9]*) TAIL_LINES=160 ;;
esac
if [ "$TAIL_LINES" -gt 500 ]; then
  TAIL_LINES=500
fi

resolve_project_dir() {
  if [ -n "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/docker-compose.yml" ] && [ -d "$PROJECT_DIR/.git" ]; then
    printf '%s\n' "$PROJECT_DIR"
    return 0
  fi

  local candidates=(
    "/var/www/mercasto"
    "$HOME/mercasto"
    "/root/mercasto"
    "/opt/mercasto"
    "/srv/mercasto"
    "/work"
  )

  local dir
  for dir in "${candidates[@]}"; do
    if [ -f "$dir/docker-compose.yml" ] && [ -d "$dir/.git" ]; then
      printf '%s\n' "$dir"
      return 0
    fi
  done

  local found
  found=$(find /var/www /root /home /opt /srv /work -maxdepth 4 -name docker-compose.yml -print 2>/dev/null | head -1 || true)
  if [ -n "$found" ] && [ -d "$(dirname "$found")/.git" ]; then
    dirname "$found"
    return 0
  fi

  echo "Mercasto project directory was not found." >&2
  return 1
}

PROJECT_DIR="$(resolve_project_dir)"
cd "$PROJECT_DIR"
git config --global --add safe.directory "$PROJECT_DIR" || true
COMPOSE_BASE=(docker compose --env-file "$COMPOSE_ENV_FILE")
COMPOSE_PROD=(docker compose --env-file "$COMPOSE_ENV_FILE" -f docker-compose.yml -f docker-compose.override.yml)
SERVER_OPERATOR_TMPDIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-server-operator.XXXXXX")"
trap 'rm -rf "$SERVER_OPERATOR_TMPDIR"' EXIT

require_confirm() {
  if [ "${CONFIRM:-}" != "MERCASTO" ]; then
    echo "Refusing mutating operation '$OPERATION': confirm must be MERCASTO." >&2
    exit 64
  fi
}

print_header() {
  echo ""
  echo "== $1 =="
}

compose_ps() {
  "${COMPOSE_PROD[@]}" ps
}

is_production_checkout() {
  [ "$PROJECT_DIR" = "/var/www/mercasto" ]
}

clear_laravel_bootstrap_caches() {
  local cache_dir="$PROJECT_DIR/backend/bootstrap/cache"

  print_header "Clear stale Laravel bootstrap caches"
  if is_production_checkout; then
    sudo -n rm -f backend/bootstrap/cache/*.php
    return
  fi

  rm -f "$cache_dir/config.php" "$cache_dir/events.php"
  find "$cache_dir" -maxdepth 1 -type f -name 'routes-*.php' -delete
}

refresh_laravel_bootstrap_caches() {
  print_header "Refresh Laravel bootstrap caches"
  "${COMPOSE_PROD[@]}" exec -T mercasto-backend php artisan optimize
  test -s "$PROJECT_DIR/backend/bootstrap/cache/config.php"
}

retry_command() {
  local attempts="${SERVER_OPERATOR_RETRY_ATTEMPTS:-6}"
  local delay="${SERVER_OPERATOR_RETRY_DELAY:-5}"
  local attempt

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if "$@"; then
      return 0
    fi
    if [ "$attempt" -lt "$attempts" ]; then
      echo "command failed; retrying in ${delay}s ($attempt/$attempts): $*" >&2
      sleep "$delay"
    fi
  done

  echo "command failed after $attempts attempts: $*" >&2
  return 1
}

download_with_retry() {
  local url="$1"
  local output="$2"
  local attempts="${SERVER_OPERATOR_RETRY_ATTEMPTS:-6}"
  local delay="${SERVER_OPERATOR_RETRY_DELAY:-5}"
  local attempt
  local tmp

  tmp="$(mktemp "$SERVER_OPERATOR_TMPDIR/download.XXXXXX")"
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl -fsS --max-time 30 "$url" >"$tmp"; then
      mv "$tmp" "$output"
      return 0
    fi
    if [ "$attempt" -lt "$attempts" ]; then
      echo "download failed; retrying in ${delay}s ($attempt/$attempts): $url" >&2
      sleep "$delay"
    fi
  done

  rm -f "$tmp"
  echo "download failed after $attempts attempts: $url" >&2
  return 1
}

public_smoke() {
  print_header "Public HTTP smoke"
  retry_command curl -fsSI --max-time 30 https://mercasto.com/ | head -n 20
  retry_command curl -fsSI --max-time 30 https://mercasto.com/api/categories | head -n 20
  curl -ksSI --max-time 30 https://mercasto.com/horizon | head -n 20 || true
  curl -ksSI --max-time 30 https://mercasto.com/vendor/horizon | head -n 20 || true
}

nginx_config_test() {
  print_header "Validate nginx config"
  "${COMPOSE_PROD[@]}" exec -T mercasto-frontend nginx -t
}

nginx_reload_upstreams() {
  print_header "Reload nginx upstreams"
  "${COMPOSE_PROD[@]}" exec -T mercasto-frontend nginx -s reload
}

seo_aeo_probe() {
  print_header "SEO/AEO smoke"
  local home="$SERVER_OPERATOR_TMPDIR/home.html"
  local sitemap="$SERVER_OPERATOR_TMPDIR/sitemap.xml"
  local robots="$SERVER_OPERATOR_TMPDIR/robots.txt"
  download_with_retry https://mercasto.com/ "$home"
  download_with_retry https://mercasto.com/sitemap.xml "$sitemap"
  download_with_retry https://mercasto.com/robots.txt "$robots"
  grep -Eiq '<title[^>]*>[^<]{10,160}</title>' "$home"
  grep -Eiq 'name="description"|property="og:description"' "$home"
  grep -Eiq 'application/ld\+json|schema.org' "$home"
  grep -Eiq '<urlset|<sitemapindex|<url>' "$sitemap"
  grep -Eiq 'Sitemap:|User-agent:' "$robots"
  echo "SEO/AEO smoke OK"
}

preflight_runner_memory() {
  [ -x scripts/runner-memory-preflight.sh ] || return 0
  print_header "Runner memory preflight"
  bash scripts/runner-memory-preflight.sh --label "mercasto-verify-quick"
}

run_verify_quick() {
  print_header "verify:quick"
  preflight_runner_memory
  if command -v npm >/dev/null 2>&1; then
    npm run verify:quick
    bash scripts/offsite-backup-smoke.sh
    bash scripts/media-offsite-backup-smoke.sh
    bash scripts/production-schema-drift-smoke.sh
    bash scripts/production-e2e-account-security-smoke.sh
    bash scripts/postgres-observability-activation-smoke.sh
    return
  fi

  echo "npm not found; running server-compatible verify:quick fallback"
  find scripts -type f -name '*.sh' -print0 | xargs -0 -r -n1 bash -n
  "${COMPOSE_BASE[@]}" config >"$SERVER_OPERATOR_TMPDIR/compose-base.out"
  "${COMPOSE_PROD[@]}" config >"$SERVER_OPERATOR_TMPDIR/compose-override.out"
  bash scripts/static-safety-scans.sh
  bash scripts/production-smoke.sh
  bash scripts/category-filter-smoke.sh
  bash scripts/auth-providers-smoke.sh
  bash scripts/public-manifest-smoke.sh
  bash scripts/security-probes.sh
  bash scripts/production-error-mode-smoke.sh
  bash scripts/production-session-security-smoke.sh
  bash scripts/origin-edge-security-smoke.sh
  bash scripts/offsite-backup-smoke.sh
  bash scripts/media-offsite-backup-smoke.sh
  bash scripts/production-schema-drift-smoke.sh
  bash scripts/postgres-observability-activation-smoke.sh
  bash scripts/listing-route-smoke.sh
  bash scripts/production-route-audit.sh
  seo_aeo_probe
  bash scripts/cache-header-smoke.sh
  bash scripts/public-copy-scan.sh
}

case "$OPERATION" in
  status)
    print_header "Git status"
    git status --short
    git log -1 --oneline
    print_header "Docker compose status"
    compose_ps
    public_smoke
    ;;

  verify_quick)
    run_verify_quick
    ;;

  deploy_main)
    require_confirm
    print_header "Sync main"
    if is_production_checkout; then
      sudo -n git fetch origin
      sudo -n git reset --hard origin/main
      sudo -n git switch -C main origin/main
      sudo -n git clean -fd -e runners/data1 -e runners/data2 -e runners/data3 -e runners/.env
    else
      git fetch origin main --prune
      git reset --hard origin/main
      git switch -C main origin/main
      git clean -fd -e runners/data1 -e runners/data2 -e runners/data3 -e runners/.env
    fi
    clear_laravel_bootstrap_caches
    print_header "Build and start stack"
    bash scripts/compose-orphan-preflight.sh "${COMPOSE_PROD[@]:2}"
    "${COMPOSE_PROD[@]}" up -d --build --remove-orphans --renew-anon-volumes
    nginx_config_test
    print_header "Run migrations"
    "${COMPOSE_PROD[@]}" exec -T mercasto-backend php artisan migrate --force
    refresh_laravel_bootstrap_caches
    nginx_reload_upstreams
    run_verify_quick
    ;;

  restart_frontend)
    require_confirm
    print_header "Restart frontend"
    "${COMPOSE_PROD[@]}" up -d --no-deps --force-recreate mercasto-frontend
    nginx_config_test
    compose_ps
    public_smoke
    ;;

  restart_stack)
    require_confirm
    print_header "Restart stack"
    bash scripts/compose-orphan-preflight.sh "${COMPOSE_PROD[@]:2}"
    "${COMPOSE_PROD[@]}" up -d --remove-orphans
    nginx_config_test
    compose_ps
    public_smoke
    ;;

  align_media_caps)
    require_confirm
    print_header "Align nginx media upload cap"
    python3 - <<'PY'
from pathlib import Path
path = Path('default.conf')
text = path.read_text()
old = 'client_max_body_size 25m;'
new = 'client_max_body_size 64m;'
if new in text:
    print('client_max_body_size already aligned to 64m')
elif old in text:
    path.write_text(text.replace(old, new, 1))
    print('client_max_body_size aligned from 25m to 64m')
else:
    raise SystemExit('expected client_max_body_size 25m or 64m in default.conf')
PY
    grep -n "client_max_body_size" default.conf
    nginx_config_test
    print_header "Restart frontend with aligned config"
    "${COMPOSE_PROD[@]}" up -d --no-deps --force-recreate mercasto-frontend
    compose_ps
    public_smoke
    run_verify_quick
    ;;

  security_smoke)
    print_header "Security probes"
    if command -v npm >/dev/null 2>&1; then
      npm run smoke:security
    else
      bash scripts/security-probes.sh
    fi
    ;;

  seo_aeo_smoke)
    seo_aeo_probe
    ;;

  content_quality_audit)
    print_header "Active listing content quality audit"
    "${COMPOSE_PROD[@]}" exec -T mercasto-backend php artisan ads:audit-active-content-quality --limit-groups=20
    ;;

  runner_health)
    print_header "GitHub runner services"
    if command -v systemctl >/dev/null 2>&1; then
      mapfile -t runner_services < <(
        systemctl list-units --type=service --all --no-legend 'actions.runner.*.service' 2>/dev/null           | awk '{print $1}'
      )
      if [[ "${#runner_services[@]}" -eq 0 ]]; then
        echo "No systemd GitHub runner service found."
      else
        for service in "${runner_services[@]}"; do
          echo "-- $service --"
          systemctl show "$service" --no-pager             -p ActiveState -p SubState -p MainPID -p NRestarts
        done
      fi
    else
      echo "systemctl is unavailable."
    fi

    echo ""
    echo "-- Runner.Listener processes --"
    ps -eo pid=,user=,etime=,args= | grep '[R]unner.Listener' || echo "No Runner.Listener process found."

    echo ""
    echo "-- Legacy Docker runner containers --"
    docker ps -a --filter name=gh-runner --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
    ;;

  logs_frontend)
    print_header "Frontend logs"
    docker logs --tail="$TAIL_LINES" mercasto_frontend_container 2>&1
    ;;

  logs_backend)
    print_header "Backend logs"
    docker logs --tail="$TAIL_LINES" mercasto_backend_container 2>&1 | sed -E 's/(APP_KEY|DB_PASSWORD|REDIS_PASSWORD|CLIP_[A-Z_]+|SENTRY_[A-Z_]+)=([^[:space:]]+)/\1=***REDACTED***/g'
    ;;

  hermes_install)
    require_confirm
    print_header "Install Hermes Agent CLI"
    HERMES_INSTALLER="$(mktemp "$SERVER_OPERATOR_TMPDIR/hermes-install.XXXXXX")"
    curl -fsSL --retry 4 --retry-delay 3 \
      https://hermes-agent.nousresearch.com/install.sh \
      -o "$HERMES_INSTALLER"
    chmod 0700 "$HERMES_INSTALLER"
    sudo -n env HOME=/root bash "$HERMES_INSTALLER" \
      --skip-setup \
      --skip-browser \
      --skip-computer-use \
      --non-interactive \
      --hermes-home /root/.hermes
    sudo -n test -x /usr/local/bin/hermes
    sudo -n /usr/local/bin/hermes --version
    echo "hermes_home=/root/.hermes"
    echo "harness_service=$(systemctl is-active deepseek-harness.service 2>/dev/null || true)"
    echo "harness_proxy=$(systemctl is-active deepseek-harness-proxy.service 2>/dev/null || true)"
    ;;

  hermes_publish)
    require_confirm
    print_header "Configure Hermes models and publish dashboard"
    sudo -n bash <<'ROOT'
set -euo pipefail

HERMES_HOME=/root/.hermes
DSH_HOME=/root/.dsh
CREDS="$DSH_HOME/.credentials.yaml"
CONFIG="$HERMES_HOME/config.yaml"
ENV_FILE="$HERMES_HOME/.env"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="/root/hermes-backups/$STAMP"
DOMAIN="hermes.flyaicrm.com"
HARNESS_DOMAIN="harness.flyaicrm.com"
DASH_PORT=9119

install -d -m 0700 "$BACKUP"
test -x /usr/local/bin/hermes
test -s "$CREDS"
test -s "$CONFIG"
test -s "$ENV_FILE"
cp -a "$CONFIG" "$BACKUP/config.yaml"
cp -a "$ENV_FILE" "$BACKUP/.env"
chmod 0600 "$BACKUP/config.yaml" "$BACKUP/.env"

python3 - "$CREDS" "$CONFIG" "$ENV_FILE" <<'PY'
import os
import sys
import tempfile
from pathlib import Path
import yaml

creds_path = Path(sys.argv[1])
config_path = Path(sys.argv[2])
env_path = Path(sys.argv[3])

creds = yaml.safe_load(creds_path.read_text()) or {}
refs = creds.get("refs") or {}

deep_key = refs.get("DEEPSEEK_API_KEY")
if not deep_key:
    for k, v in refs.items():
        if "DEEPSEEK" in str(k).upper() and isinstance(v, str) and v.strip():
            deep_key = v.strip()
            break

openrouter_key = refs.get("OPENROUTER_API_KEY")
if not deep_key:
    raise SystemExit("DeepSeek credential not found in DSH credential store")
if not openrouter_key:
    raise SystemExit("OpenRouter credential not found in DSH credential store")

env = {}
for line in env_path.read_text().splitlines():
    if not line or line.lstrip().startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    env[key] = value
env["DEEPSEEK_API_KEY"] = deep_key.strip()
env["OPENROUTER_API_KEY"] = openrouter_key.strip()

fd, tmp = tempfile.mkstemp(dir=str(env_path.parent), prefix=".env.", text=True)
try:
    with os.fdopen(fd, "w") as fh:
        for key in sorted(env):
            fh.write(f"{key}={env[key]}\n")
        fh.flush()
        os.fsync(fh.fileno())
    os.chmod(tmp, 0o600)
    os.replace(tmp, env_path)
finally:
    if os.path.exists(tmp):
        os.unlink(tmp)

config = yaml.safe_load(config_path.read_text()) or {}
config["model"] = {
    "provider": "deepseek",
    "default": "deepseek-v4-flash",
}
config["fallback_providers"] = [
    {
        "provider": "openrouter",
        "model": "z-ai/glm-5.3-flash:free",
    }
]

fd, tmp = tempfile.mkstemp(dir=str(config_path.parent), prefix=".config.", text=True)
try:
    with os.fdopen(fd, "w") as fh:
        yaml.safe_dump(config, fh, sort_keys=False)
        fh.flush()
        os.fsync(fh.fileno())
    os.chmod(tmp, 0o600)
    os.replace(tmp, config_path)
finally:
    if os.path.exists(tmp):
        os.unlink(tmp)

print("hermes_primary=deepseek/deepseek-v4-flash")
print("hermes_fallback=openrouter/z-ai/glm-5.3-flash:free")
PY

cd /usr/local/lib/hermes-agent
/root/.hermes/bin/uv sync --frozen --extra web --extra pty >/tmp/hermes-web-sync.log 2>&1

timeout 180s /usr/local/bin/hermes chat -Q \
  --provider deepseek \
  --model deepseek-v4-flash \
  -q 'Reply with exactly: HERMES_DEEPSEEK_OK' \
  >/tmp/hermes-deepseek-smoke 2>&1
grep -q 'HERMES_DEEPSEEK_OK' /tmp/hermes-deepseek-smoke
echo "HERMES_DEEPSEEK_SMOKE=ok"

timeout 180s /usr/local/bin/hermes chat -Q \
  --provider openrouter \
  --model z-ai/glm-5.3-flash:free \
  -q 'Reply with exactly: HERMES_GLM_OK' \
  >/tmp/hermes-glm-smoke 2>&1
grep -q 'HERMES_GLM_OK' /tmp/hermes-glm-smoke
echo "HERMES_GLM_SMOKE=ok"

cat >/etc/systemd/system/hermes-dashboard.service <<'EOF'
[Unit]
Description=Hermes Agent Web Dashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
Group=root
Environment=HOME=/root
EnvironmentFile=/root/.hermes/.env
WorkingDirectory=/usr/local/lib/hermes-agent
ExecStart=/usr/local/bin/hermes dashboard --host 127.0.0.1 --port 9119 --no-open
Restart=on-failure
RestartSec=3
TimeoutStartSec=60
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now hermes-dashboard.service
sleep 3
systemctl is-active --quiet hermes-dashboard.service
curl -fsS --max-time 15 "http://127.0.0.1:$DASH_PORT/api/status" >/tmp/hermes-dashboard-status.json
python3 - /tmp/hermes-dashboard-status.json <<'PY'
import json,sys
data=json.load(open(sys.argv[1]))
print("dashboard_local_status=ok")
print("dashboard_auth_required=" + str(data.get("auth_required")).lower())
PY

HARNESS_CONF="$(
  grep -RIl \
    --include='*' \
    -E 'server_name[[:space:]]+[^;]*harness\.flyaicrm\.com' \
    /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d \
    2>/dev/null | head -1 || true
)"
if [ -z "$HARNESS_CONF" ]; then
  echo "HERMES_PUBLISH_BLOCKED=harness_nginx_config_not_found" >&2
  exit 51
fi

AUTH_FILE="$(
  awk '
    $1 == "auth_basic_user_file" {
      gsub(/;/,"",$2)
      print $2
      exit
    }
  ' "$HARNESS_CONF"
)"
if [ -z "$AUTH_FILE" ] || [ ! -s "$AUTH_FILE" ]; then
  echo "HERMES_PUBLISH_BLOCKED=harness_auth_file_not_found" >&2
  exit 52
fi
echo "hermes_auth_source=harness"

HARNESS_IP="$(getent ahostsv4 "$HARNESS_DOMAIN" | awk 'NR==1 {print $1}' || true)"
HERMES_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1 {print $1}' || true)"
echo "harness_dns=\${HARNESS_IP:-<unresolved>}"
echo "hermes_dns=\${HERMES_IP:-<unresolved>}"
if [ -z "$HARNESS_IP" ] || [ -z "$HERMES_IP" ] || [ "$HARNESS_IP" != "$HERMES_IP" ]; then
  echo "HERMES_DNS_NOT_READY" >&2
  exit 53
fi

install -d -m 0755 /var/www/letsencrypt
install -d -m 0755 /etc/nginx/sites-available /etc/nginx/sites-enabled

cat >/etc/nginx/sites-available/hermes.flyaicrm.com <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name hermes.flyaicrm.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        auth_basic off;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF
ln -sfn /etc/nginx/sites-available/hermes.flyaicrm.com /etc/nginx/sites-enabled/hermes.flyaicrm.com
nginx -t
systemctl reload nginx

if [ ! -s /etc/letsencrypt/live/hermes.flyaicrm.com/fullchain.pem ] || \
   [ ! -s /etc/letsencrypt/live/hermes.flyaicrm.com/privkey.pem ]; then
  if ! command -v certbot >/dev/null 2>&1; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot
  fi
  certbot certonly \
    --webroot \
    -w /var/www/letsencrypt \
    -d hermes.flyaicrm.com \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email
fi

test -s /etc/letsencrypt/live/hermes.flyaicrm.com/fullchain.pem
test -s /etc/letsencrypt/live/hermes.flyaicrm.com/privkey.pem

cat >/etc/nginx/sites-available/hermes.flyaicrm.com <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name hermes.flyaicrm.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        auth_basic off;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name hermes.flyaicrm.com;

    ssl_certificate /etc/letsencrypt/live/hermes.flyaicrm.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hermes.flyaicrm.com/privkey.pem;

    auth_basic "Hermes";
    auth_basic_user_file \${AUTH_FILE};

    location / {
        proxy_pass http://127.0.0.1:9119;
        proxy_http_version 1.1;
        proxy_set_header Host 127.0.0.1:9119;
        proxy_set_header Origin http://127.0.0.1:9119;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

nginx -t
systemctl reload nginx

HTTP_CODE="$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 20 https://hermes.flyaicrm.com/)"
if [ "$HTTP_CODE" != "401" ]; then
  echo "Unexpected unauthenticated HTTPS status: $HTTP_CODE" >&2
  exit 54
fi

echo "hermes_dashboard_service=$(systemctl is-active hermes-dashboard.service)"
echo "harness_service=$(systemctl is-active deepseek-harness.service 2>/dev/null || true)"
echo "harness_proxy=$(systemctl is-active deepseek-harness-proxy.service 2>/dev/null || true)"
echo "hermes_url=https://hermes.flyaicrm.com"
echo "hermes_external_auth=nginx_basic_reused_from_harness"
echo "HERMES_PUBLISH_OK"

rm -f /tmp/hermes-web-sync.log \
  /tmp/hermes-deepseek-smoke \
  /tmp/hermes-glm-smoke \
  /tmp/hermes-dashboard-status.json
ROOT
    ;;

  cleanup_build_cache)
    require_confirm
    print_header "Bounded Docker build-cache cleanup"
    CONFIRM="$CONFIRM" bash scripts/docker-build-cache-cleanup.sh
    ;;

  cleanup_docker)
    require_confirm
    print_header "Docker cleanup"
    docker system prune -af --volumes=false
    docker builder prune -af
    df -h /
    ;;

  maintenance_reboot)
    require_confirm
    print_header "Maintenance reboot preflight"
    npm run maintenance:precheck

    if [ ! -f /var/run/reboot-required ]; then
      echo "Refusing reboot: /var/run/reboot-required is absent." >&2
      exit 65
    fi

    latest_backup=$(
      find postgres-backups -maxdepth 1 -type f -name 'backup_*.dump' -size +0c -printf '%T@ %p\n' \
        | sort -nr | head -1 | cut -d' ' -f2-
    )
    if [ -z "$latest_backup" ]; then
      echo "Refusing reboot: no non-empty PostgreSQL backup found." >&2
      exit 66
    fi

    backup_age=$(( $(date +%s) - $(stat -c %Y "$latest_backup") ))
    if [ "$backup_age" -gt 7200 ]; then
      echo "Refusing reboot: latest PostgreSQL backup is older than 2 hours." >&2
      exit 67
    fi

    docker exec -i mercasto_db_container pg_restore -l < "$latest_backup" >/dev/null
    sudo -n bash scripts/compose-orphan-preflight.sh "${COMPOSE_PROD[@]:2}"
    public_smoke
    echo "Validated backup: $latest_backup (age=${backup_age}s)"
    echo "Scheduling host reboot in 45 seconds so the workflow can publish its result."
    sudo -n systemd-run --unit=mercasto-maintenance-reboot \
      --on-active=45s --timer-property=AccuracySec=1s --collect \
      /usr/bin/systemctl reboot
    ;;

  *)
    echo "Unknown operation: $OPERATION" >&2
    exit 2
    ;;
esac
