#!/usr/bin/env bash
set -euo pipefail

if [ "${CONFIRM:-}" != "MERCASTO" ]; then
  echo "Refusing build-cache cleanup: CONFIRM must be MERCASTO." >&2
  exit 64
fi

active_builds() {
  ps -eo pid=,args= \
    | awk -v self="$$" '$1 != self { $1=""; sub(/^[[:space:]]+/, ""); print }' \
    | grep -E '(^|[[:space:]])docker([[:space:]]+compose)?[[:space:]]+build([[:space:]]|$)|docker-buildx([[:space:]]+(build|bake)|[[:space:]]|$)|(^|[[:space:]])buildx[[:space:]]+(build|bake)([[:space:]]|$)' \
    || true
}

refuse_if_build_active() {
  local builds
  builds="$(active_builds)"
  if [ -n "$builds" ]; then
    echo "Refusing build-cache cleanup: an active Docker/Buildx/Compose build is running on this shared host." >&2
    printf '%s\n' "$builds" >&2
    exit 73
  fi
}

# Fast fail before any potentially slow Docker inspection.
refuse_if_build_active

echo "== Docker build cache before cleanup =="
if ! timeout 15 docker system df; then
  echo "WARNING: docker system df timed out; continuing only after a fresh active-build check." >&2
fi

# Re-check immediately before the only mutating command. This closes the
# inspection-to-prune window that previously allowed another project build to start.
refuse_if_build_active

echo
echo "Pruning only unused Docker builder cache older than 24 hours."
docker builder prune -af --filter 'until=24h'

echo
echo "== Docker build cache after cleanup =="
timeout 15 docker system df || echo "WARNING: post-cleanup docker system df timed out." >&2
df -h /
