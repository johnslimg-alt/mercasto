#!/usr/bin/env bash
set -euo pipefail

OPERATION="${OPERATION:-${1:-status}}"
CONFIRM="${CONFIRM:-${2:-}}"
TAIL_LINES="${TAIL_LINES:-160}"
PROJECT_DIR="${PROJECT_DIR:-}"

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
  docker compose -f docker-compose.yml -f docker-compose.override.yml ps
}

public_smoke() {
  print_header "Public HTTP smoke"
  curl -fsSI --max-time 30 https://mercasto.com/ | head -n 20
  curl -fsSI --max-time 30 https://mercasto.com/api/categories | head -n 20
  curl -fsSI --max-time 30 https://mercasto.com/horizon | head -n 20 || true
  curl -fsSI --max-time 30 https://mercasto.com/vendor/horizon | head -n 20 || true
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
    print_header "verify:quick"
    npm run verify:quick
    ;;

  deploy_main)
    require_confirm
    print_header "Sync main"
    git fetch origin main --prune
    git reset --hard origin/main
    git clean -fd -e runners/data1 -e runners/data2 -e runners/data3 -e runners/.env
    print_header "Build and start stack"
    docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --build --remove-orphans
    print_header "Run migrations"
    docker compose -f docker-compose.yml -f docker-compose.override.yml exec -T mercasto-backend php artisan migrate --force
    print_header "Verify"
    npm run verify:quick
    ;;

  restart_frontend)
    require_confirm
    print_header "Restart frontend"
    docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --no-deps --force-recreate mercasto-frontend
    compose_ps
    public_smoke
    ;;

  restart_stack)
    require_confirm
    print_header "Restart stack"
    docker compose -f docker-compose.yml -f docker-compose.override.yml up -d --remove-orphans
    compose_ps
    public_smoke
    ;;

  security_smoke)
    print_header "Security probes"
    npm run smoke:security
    ;;

  seo_aeo_smoke)
    print_header "SEO/AEO smoke"
    curl -fsS https://mercasto.com/ >/tmp/mercasto-home.html
    curl -fsS https://mercasto.com/sitemap.xml >/tmp/mercasto-sitemap.xml
    curl -fsS https://mercasto.com/robots.txt >/tmp/mercasto-robots.txt
    grep -Eiq '<title[^>]*>[^<]{10,70}</title>' /tmp/mercasto-home.html
    grep -Eiq 'name="description"|property="og:description"' /tmp/mercasto-home.html
    grep -Eiq 'application/ld\+json|schema.org' /tmp/mercasto-home.html
    grep -Eiq '<urlset|<sitemapindex|<url>' /tmp/mercasto-sitemap.xml
    grep -Eiq 'Sitemap:|User-agent:' /tmp/mercasto-robots.txt
    echo "SEO/AEO smoke OK"
    ;;

  runner_health)
    print_header "GitHub runners"
    docker ps -a --filter name=gh-runner --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
    for runner in gh-runner-1 gh-runner-2 gh-runner-3; do
      if docker inspect "$runner" >/dev/null 2>&1; then
        echo ""
        echo "-- $runner logs --"
        docker logs --tail=40 "$runner" 2>&1 | sed -E 's/(ACCESS_TOKEN|RUNNER_TOKEN|GITHUB_ACCESS_TOKEN)=([^[:space:]]+)/\1=***REDACTED***/g'
      fi
    done
    ;;

  logs_frontend)
    print_header "Frontend logs"
    docker logs --tail="$TAIL_LINES" mercasto_frontend_container 2>&1
    ;;

  logs_backend)
    print_header "Backend logs"
    docker logs --tail="$TAIL_LINES" mercasto_backend_container 2>&1 | sed -E 's/(APP_KEY|DB_PASSWORD|REDIS_PASSWORD|CLIP_[A-Z_]+|SENTRY_[A-Z_]+)=([^[:space:]]+)/\1=***REDACTED***/g'
    ;;

  cleanup_docker)
    require_confirm
    print_header "Docker cleanup"
    docker system prune -af --volumes=false
    docker builder prune -af
    df -h /
    ;;

  *)
    echo "Unknown operation: $OPERATION" >&2
    exit 2
    ;;
esac
