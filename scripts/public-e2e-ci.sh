#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_id="${GITHUB_RUN_ID:-manual-$(date -u +%Y%m%dT%H%M%SZ)}"
artifact_root="${PLAYWRIGHT_ARTIFACT_ROOT:-/tmp/mercasto-public-e2e-${run_id}-$(id -u)}"
results_dir="${PLAYWRIGHT_RESULTS_DIR:-${artifact_root}/test-results}"
report_dir="${PLAYWRIGHT_HTML_OUTPUT_DIR:-${artifact_root}/playwright-report}"

rm -rf -- "$results_dir" "$report_dir"
mkdir -p -- "$results_dir" "$report_dir"

export CI=1
export BASE_URL="${PLAYWRIGHT_BASE_URL:-${BASE_URL:-https://mercasto.com}}"
export PLAYWRIGHT_HTML_OUTPUT_DIR="$report_dir"
export PLAYWRIGHT_HTML_OPEN=never
workers="${PLAYWRIGHT_WORKERS:-1}"
if [[ ! "$workers" =~ ^[1-9][0-9]*$ ]]; then
  echo "PLAYWRIGHT_WORKERS must be a positive integer, got: $workers" >&2
  exit 2
fi

if [[ ! -x node_modules/.bin/playwright ]]; then
  npm ci --no-audit --no-fund
fi

if [[ "${PLAYWRIGHT_SKIP_BROWSER_INSTALL:-0}" != "1" ]]; then
  npx --no-install playwright install chromium
fi

npx --no-install playwright test \
  tests/e2e/public-smoke.spec.js \
  tests/e2e/public-link-integrity.spec.js \
  tests/e2e/catalog-filter-state.spec.js \
  --workers="$workers" \
  --output="$results_dir"

printf 'public E2E artifact root: %s\n' "$artifact_root"
