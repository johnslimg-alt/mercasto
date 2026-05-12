#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-quick}"

print_header() {
  echo ""
  echo "== $1 =="
}

resolve_project_dir() {
  local candidates=(
    "${PROJECT_DIR:-}"
    "/var/www/mercasto"
    "$HOME/mercasto"
    "/root/mercasto"
    "/opt/mercasto"
    "/srv/mercasto"
    "/work"
  )

  local dir
  for dir in "${candidates[@]}"; do
    if [ -n "$dir" ] && [ -f "$dir/docker-compose.yml" ] && [ -d "$dir/.git" ]; then
      printf '%s\n' "$dir"
      return 0
    fi
  done

  echo "Mercasto project directory was not found." >&2
  exit 1
}

PROJECT_DIR="$(resolve_project_dir)"
cd "$PROJECT_DIR"
git config --global --add safe.directory "$PROJECT_DIR" || true

case "$MODE" in
  quick)
    print_header "Quick production gate"
    npm run verify:quick
    ;;

  full)
    print_header "Full production gate"
    npm run gate:prod
    npm run verify:prod
    ;;

  cache)
    print_header "Cache and PWA gate"
    npm run check:cache-policy
    npm run smoke:cache-headers
    ;;

  seo)
    print_header "SEO and AEO gate"
    npm run smoke:seo
    npm run smoke:cache-headers
    npm run smoke:copy
    ;;

  security)
    print_header "Security gate"
    npm run smoke:security
    npm run check:payment-retention
    npm run check:cache-policy
    ;;

  status)
    print_header "Repository status"
    git status --short
    git log -1 --oneline
    print_header "Docker compose status"
    docker compose -f docker-compose.yml -f docker-compose.override.yml ps
    ;;

  *)
    echo "Unknown gate mode: $MODE" >&2
    echo "Supported modes: quick, full, cache, seo, security, status" >&2
    exit 2
    ;;
esac
