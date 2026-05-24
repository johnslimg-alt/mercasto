#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-johnslimg-alt/mercasto}"
REF="${REF:-main}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

require_cmd gh

echo "== Dispatch launch evidence workflows =="
echo "repo=$REPO"
echo "ref=$REF"

workflows=(
  "launch-artifact-inventory.yml"
  "launch-status-summary.yml"
  "env-readiness.yml"
  "category-data-readiness.yml"
  "sms-readiness.yml"
  "backup-freshness.yml"
  "e2e-public-smoke.yml"
)

for workflow in "${workflows[@]}"; do
  echo "dispatching $workflow"
  gh workflow run "$workflow" --repo "$REPO" --ref "$REF"
done

echo "== Recent workflow runs =="
gh run list --repo "$REPO" --limit 20

echo "dispatch launch evidence workflows OK"
