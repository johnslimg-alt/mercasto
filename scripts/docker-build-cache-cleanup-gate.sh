#!/usr/bin/env bash
set -euo pipefail

HELPER=scripts/docker-build-cache-cleanup.sh
OPERATOR=scripts/server-operator.sh
WORKFLOW=.github/workflows/chatgpt-server-operator.yml
STATUS=scripts/server-status-safe.sh

grep -qF "docker builder prune -af --filter 'until=24h'" "$HELPER"
grep -qF 'Refusing build-cache cleanup: an active Docker/Buildx/Compose build is running on this shared host.' "$HELPER"
grep -qF 'CONFIRM must be MERCASTO' "$HELPER"
grep -qF 'refuse_if_build_active' "$HELPER"
grep -qF 'timeout 15 docker system df' "$HELPER"
[ "$(grep -c '^refuse_if_build_active$' "$HELPER")" -eq 2 ]
if grep -Eq 'docker system prune|docker image prune|docker volume prune|--volumes' "$HELPER"; then
  echo "build-cache helper widened beyond builder cache" >&2
  exit 1
fi
grep -qF '  cleanup_build_cache)' "$OPERATOR"
grep -qF 'bash scripts/docker-build-cache-cleanup.sh' "$OPERATOR"
grep -qF 'RUN:cleanup_build_cache:MERCASTO' "$WORKFLOW"
grep -qF "['cleanup_build_cache', 'MERCASTO', '160']" "$WORKFLOW"
grep -qF '== Host storage ==' "$STATUS"
grep -qF 'WARNING: root filesystem usage is' "$STATUS"

echo "docker build-cache cleanup gate OK"
