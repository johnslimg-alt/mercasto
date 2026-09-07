#!/usr/bin/env bash
set -euo pipefail

if [ "${CONFIRM:-}" != "MERCASTO" ]; then
  echo "Refusing build-cache cleanup: CONFIRM must be MERCASTO." >&2
  exit 64
fi

active_builds=$(
  ps -eo pid=,args= \
    | awk -v self="$$" '$1 != self { $1=""; sub(/^[[:space:]]+/, ""); print }' \
    | grep -E '(^|[[:space:]])docker([[:space:]]+compose)?[[:space:]]+build([[:space:]]|$)|docker-buildx([[:space:]]+(build|bake)|[[:space:]]|$)|(^|[[:space:]])buildx[[:space:]]+(build|bake)([[:space:]]|$)' \
    || true
)

if [ -n "$active_builds" ]; then
  echo "Refusing build-cache cleanup: an active Docker/Buildx/Compose build is running on this shared host." >&2
  printf '%s\n' "$active_builds" >&2
  exit 73
fi

echo "== Docker build cache before cleanup =="
docker system df

echo
echo "Pruning only unused Docker builder cache older than 24 hours."
docker builder prune -af --filter 'until=24h'

echo
echo "== Docker build cache after cleanup =="
docker system df
df -h /
