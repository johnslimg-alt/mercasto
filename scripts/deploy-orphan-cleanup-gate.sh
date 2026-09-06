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

preflight_line=$(grep -n 'bash scripts/compose-orphan-preflight.sh --env-file "$COMPOSE_ENV_FILE"' "$WF" | head -n1 | cut -d: -f1 || true)
first_remove_line=$(grep -n 'docker compose --env-file "$COMPOSE_ENV_FILE" up -d' "$WF" | grep -- '--remove-orphans' | head -n1 | cut -d: -f1 || true)
if [[ -z "$preflight_line" || -z "$first_remove_line" || "$preflight_line" -ge "$first_remove_line" ]]; then
  echo "FAIL: compose orphan preflight must run before the first production --remove-orphans call" >&2
  exit 1
fi
for op in deploy_main restart_stack; do
  block=$(awk -v op="  ${op})" '$0 == op {on=1} on {print} on && /^  [a-zA-Z0-9_]+\)/ && $0 != op {exit}' scripts/server-operator.sh)
  if ! grep -q 'compose-orphan-preflight.sh' <<<"$block"; then
    echo "FAIL: server-operator $op must run compose orphan preflight" >&2
    exit 1
  fi
done
echo "deploy orphan preflight ordering OK"
