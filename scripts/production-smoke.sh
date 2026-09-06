#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://mercasto.com}"
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.override.yml)
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-.env}"
COMPOSE=(docker compose --env-file "$COMPOSE_ENV_FILE" "${COMPOSE_FILES[@]}")

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

check_http_status() {
  local url="$1"
  local expected_pattern="$2"
  local attempts="${SMOKE_HTTP_ATTEMPTS:-6}"
  local delay="${SMOKE_HTTP_RETRY_DELAY:-5}"
  local attempt
  local status

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    status="$(curl -k -sS -o /dev/null -w '%{http_code}' --max-time 30 "$url" || true)"
    status="${status:-000}"
    echo "$url -> $status (attempt $attempt/$attempts)"
    if [[ "$status" =~ $expected_pattern ]]; then
      return 0
    fi
    if (( attempt < attempts )); then
      sleep "$delay"
    fi
  done

  echo "unexpected status for $url after $attempts attempts: $status" >&2
  exit 1
}

require_cmd docker
require_cmd curl

if [[ ! -f docker-compose.yml ]]; then
  echo "run this script from the Mercasto repository root" >&2
  exit 1
fi

if [[ ! -f docker-compose.override.yml ]]; then
  echo "missing docker-compose.override.yml" >&2
  exit 1
fi

echo "== Compose validation =="
"${COMPOSE[@]}" config >"/tmp/mercasto_compose_config.$(id -u).out"
grep -q 'mercasto-scheduler:' "/tmp/mercasto_compose_config.$(id -u).out"
grep -q 'mercasto-reverb:' "/tmp/mercasto_compose_config.$(id -u).out"
grep -q 'condition: service_healthy' "/tmp/mercasto_compose_config.$(id -u).out"
echo "compose config OK"

echo "== Container status =="
"${COMPOSE[@]}" ps

echo "== Public HTTP smoke =="
check_http_status "${BASE_URL}/up" '^200$'
check_http_status "${BASE_URL}/" '^(200|301|302)$'
check_http_status "${BASE_URL}/api/categories" '^200$'
check_http_status "${BASE_URL}/api/ads?page=1" '^200$'

BASE_URL="$BASE_URL" bash scripts/security-header-smoke.sh

SMOKE_HTTP_ATTEMPTS="${SMOKE_HTTP_ATTEMPTS:-12}" SMOKE_HTTP_RETRY_DELAY="${SMOKE_HTTP_RETRY_DELAY:-5}" BASE_URL="$BASE_URL"   bash scripts/crawler-policy-production-smoke.sh

echo "== Sensitive path probes =="
check_http_status "${BASE_URL}/.env" '^(403|404|410)$'
check_http_status "${BASE_URL}/.git/config" '^(403|404|410)$'
check_http_status "${BASE_URL}/backend/.env" '^(403|404|410)$'
check_http_status "${BASE_URL}/composer.json" '^(403|404|410)$'
check_http_status "${BASE_URL}/package.json" '^(403|404|410)$'

echo "== PHP upload limit settings =="
PHP_UPLOAD_MAX="$("${COMPOSE[@]}" exec -T mercasto-backend php -r 'echo ini_get("upload_max_filesize");')"
PHP_POST_MAX="$("${COMPOSE[@]}" exec -T mercasto-backend php -r 'echo ini_get("post_max_size");')"
echo "upload_max_filesize=$PHP_UPLOAD_MAX"
echo "post_max_size=$PHP_POST_MAX"
if [[ "$PHP_UPLOAD_MAX" != "64M" ]]; then
  echo "unexpected upload_max_filesize: $PHP_UPLOAD_MAX" >&2
  exit 1
fi
if [[ "$PHP_POST_MAX" != "64M" ]]; then
  echo "unexpected post_max_size: $PHP_POST_MAX" >&2
  exit 1
fi

echo "== Redis host setting =="
if [[ "$(uname)" != "Darwin" && "$(sysctl -n vm.overcommit_memory 2>/dev/null || echo unknown)" != "1" ]]; then
  echo "vm.overcommit_memory is not 1" >&2
  exit 1
fi

bash scripts/origin-edge-security-smoke.sh

bash scripts/security-audit-smoke.sh

echo "production smoke OK"

# Benchmark-only commits collect synthetic local-AI diagnostics after the
# authoritative production smoke. Results never change the deploy outcome.
COMMIT_MESSAGE="$(git log -1 --format=%B)"
if printf '%s' "$COMMIT_MESSAGE" | grep -Fq '[llamacpp-quality]'; then
  echo "== Direct llama.cpp moderation quality benchmark (non-blocking) =="
  set +e
  bash scripts/llamacpp-moderation-quality-benchmark.sh
  LLAMACPP_QUALITY_RC=$?
  set -e
  echo "llamacpp_quality_benchmark_exit_code=$LLAMACPP_QUALITY_RC"
  if [[ "$LLAMACPP_QUALITY_RC" -ne 0 ]]; then
    echo "Direct llama.cpp quality benchmark failed after successful production smoke; deploy remains unaffected." >&2
  fi
elif printf '%s' "$COMMIT_MESSAGE" | grep -Fq '[llamacpp-benchmark]'; then
  echo "== Direct llama.cpp schema benchmark (non-blocking) =="
  set +e
  bash scripts/llamacpp-vision-benchmark-json-schema.sh
  LLAMACPP_BENCHMARK_RC=$?
  set -e
  echo "llamacpp_schema_benchmark_exit_code=$LLAMACPP_BENCHMARK_RC"
  if [[ "$LLAMACPP_BENCHMARK_RC" -ne 0 ]]; then
    echo "Direct llama.cpp benchmark failed after successful production smoke; deploy remains unaffected." >&2
  fi
fi

echo "production smoke complete"
