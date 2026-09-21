#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Root-owned production checkout workflow gate =="

workflows=(
  .github/workflows/category-data-readiness.yml
  .github/workflows/env-readiness.yml
  .github/workflows/backup-freshness.yml
  .github/workflows/sms-readiness.yml
  .github/workflows/production-live-gates.yml
)

for workflow in "${workflows[@]}"; do
  test -f "$workflow"
  grep -qF 'cd /var/www/mercasto' "$workflow"
  grep -qF 'sudo -n git fetch origin main --prune' "$workflow"
  grep -qF 'sudo -n git reset --hard origin/main' "$workflow"

  if grep -nE '^[[:space:]]+git (fetch|reset|switch|clean)([[:space:]]|$)' "$workflow"; then
    echo "unsudoed git mutation found for root-owned production checkout: $workflow" >&2
    exit 1
  fi
done

grep -qF -- "- 'src/utils/helpCenterCopy.js'" .github/workflows/sms-readiness.yml
grep -qF 'dirty="$(sudo -n git status --porcelain --untracked-files=all)"' .github/workflows/production-live-gates.yml
grep -qF 'sudo -n git checkout -B main origin/main' .github/workflows/production-live-gates.yml

echo "root-owned production checkout workflow gate OK"
