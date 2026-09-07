#!/usr/bin/env bash
set -euo pipefail

TMP_ROOT="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
tmp_dir="$(mktemp -d "${TMP_ROOT%/}/mercasto-compose-config.XXXXXX")"
trap 'rm -rf "$tmp_dir"' EXIT

DB_PASSWORD="${DB_PASSWORD:-ci}" \
REDIS_PASSWORD="${REDIS_PASSWORD:-ci}" \
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-ci}" \
  docker compose config >"$tmp_dir/base.yml"

DB_PASSWORD="${DB_PASSWORD:-ci}" \
REDIS_PASSWORD="${REDIS_PASSWORD:-ci}" \
GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-ci}" \
  docker compose -f docker-compose.yml -f docker-compose.override.yml config >"$tmp_dir/production.yml"

printf 'compose config OK\n'
