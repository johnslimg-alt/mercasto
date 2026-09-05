#!/usr/bin/env bash
set -euo pipefail
WF='.github/workflows/deploy-selfhosted.yml'
echo '== Deploy orphan cleanup gate =='
count_up=$(grep -c 'docker compose --env-file "$COMPOSE_ENV_FILE" up -d' "$WF")
count_remove=$(grep 'docker compose --env-file "$COMPOSE_ENV_FILE" up -d' "$WF" | grep -c -- '--remove-orphans')
if [[ "$count_up" -eq 0 || "$count_up" -ne "$count_remove" ]]; then
  echo "FAIL: every production compose up must remove orphans (up=$count_up remove=$count_remove)" >&2
  exit 1
fi
echo "deploy compose ups protected=$count_remove"
