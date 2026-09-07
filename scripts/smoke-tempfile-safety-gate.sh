#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Smoke tempfile safety gate =="

files=(
  scripts/auth-providers-smoke.sh
  scripts/business-profile-smoke.sh
  scripts/cache-header-smoke.sh
  scripts/listing-route-smoke.sh
  scripts/security-probes.sh
  scripts/security-header-smoke.sh
  scripts/public-production-watch.sh
  scripts/session-cookie-smoke.sh
  scripts/share-og-smoke.sh
  scripts/server-operator.sh
  scripts/compose-config-gate.sh
  scripts/production-smoke.sh
  scripts/crawler-policy-production-smoke.sh
  scripts/smoke-test.sh
  scripts/ensure-local-ai-models.sh
  scripts/host-storage-headroom-gate.test.sh
)

for file in "${files[@]}"; do
  test -f "$file"
  grep -qF 'mktemp' "$file"
  grep -Eq "trap .*rm -r?f" "$file"
done

if grep -nE '/tmp/mercasto_(probe|listing_route|storage-threshold-test\.out)|\$\{TMPDIR:-/tmp\}/mercasto-(auth-providers|business-profile-(smoke|routes|migrate)|homepage-headers|cookie-headers|share-og-smoke)' "${files[@]}"; then
  echo "fixed shared temp path found in production smoke scripts" >&2
  exit 1
fi

if grep -nE '/tmp/mercasto[-_]' scripts/server-operator.sh; then
  echo "fixed shared temp path found in server operator" >&2
  exit 1
fi

if grep -nE '/tmp/mercasto_(compose_config|crawler_policy)|/tmp/mercasto-smoke-body([^.]|$)' scripts/production-smoke.sh scripts/crawler-policy-production-smoke.sh scripts/smoke-test.sh; then
  echo "fixed shared temp path found in production smoke chain" >&2
  exit 1
fi

if grep -qF 'modelfile=/tmp/mercasto-qwen38.Modelfile' scripts/ensure-local-ai-models.sh; then
  echo "fixed Ollama Modelfile path found in model bootstrap" >&2
  exit 1
fi

if ! grep -qF '"check:compose": "bash scripts/compose-config-gate.sh"' package.json; then
  echo "package check:compose must use the private compose config gate" >&2
  exit 1
fi
if ! grep -qF 'bash scripts/compose-config-gate.sh' .github/workflows/backend-image-gate.yml; then
  echo "backend image gate must use the private compose config gate" >&2
  exit 1
fi
if grep -nE 'mercasto_compose_(base|override)(\.|\.out|\$)' package.json .github/workflows/backend-image-gate.yml; then
  echo "fixed compose temp path remains outside the private compose config gate" >&2
  exit 1
fi

echo "smoke tempfile safety gate OK"
