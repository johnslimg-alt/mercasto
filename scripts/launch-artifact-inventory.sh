#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Launch artifact inventory =="

required_files=(
  "docs/autonomous-production-state-2026-05-22.md"
  "docs/autonomous-agent-execution-model.md"
  "docs/p0-launch-gates.md"
  "docs/launch-evidence-ledger.md"
  "docs/security-launch-checklist.md"
  "docs/backup-restore-rollback-runbook.md"
  "docs/payment-webhook-launch-runbook.md"
  "docs/legal-business-launch-checklist.md"
  "docs/seo-aeo-launch-checklist.md"
  "docs/soft-launch-48h-monitoring-plan.md"
  "scripts/env-readiness-smoke.sh"
  "scripts/category-data-smoke.sh"
  "scripts/backup-freshness-smoke.sh"
  "scripts/otp-abuse-control-gate.sh"
  "scripts/port-ownership-smoke.sh"
  "tests/e2e/public-smoke.spec.js"
  "playwright.config.mjs"
  ".github/workflows/e2e-public-smoke.yml"
  ".github/workflows/deploy-selfhosted.yml"
)

missing=0
for file in "${required_files[@]}"; do
  if [[ -s "$file" ]]; then
    echo "ready: $file"
  else
    echo "missing: $file" >&2
    missing=1
  fi
done

# Guardrail: launch docs must keep production-health vs public-launch distinction.
grep -qF "verify:quick" docs/p0-launch-gates.md
grep -qF "verify:launch" docs/p0-launch-gates.md
grep -qF "Production health is not launch approval" docs/autonomous-agent-execution-model.md

# Guardrail: Traefik incident must remain documented.
grep -qF "Traefik" docs/autonomous-production-state-2026-05-22.md
grep -qF "80/443" docs/autonomous-agent-execution-model.md

if [[ "$missing" -ne 0 ]]; then
  echo "Launch artifact inventory failed" >&2
  exit 1
fi

echo "launch artifact inventory OK"
