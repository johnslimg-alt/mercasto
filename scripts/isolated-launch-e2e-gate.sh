#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
echo "== Isolated launch E2E gate =="
grep -qF 'E2E test users cannot be seeded in production.' backend/database/seeders/E2eTestSeeder.php
grep -qF 'E2E_ISOLATED_STACK=1' scripts/run-isolated-launch-e2e.sh
grep -qF 'pgvector/pgvector:pg18' scripts/run-isolated-launch-e2e.sh
grep -qF 'tests/e2e/auth-flow.spec.js' scripts/run-isolated-launch-e2e.sh
grep -qF 'tests/e2e/ads-lifecycle.spec.js' scripts/run-isolated-launch-e2e.sh
grep -qF 'tests/e2e/payments.spec.js' scripts/run-isolated-launch-e2e.sh
grep -qF 'never mutate production payments' tests/e2e/payments.spec.js
node --check scripts/clip-e2e-mock.mjs
bash -n scripts/run-isolated-launch-e2e.sh
echo "isolated launch E2E gate OK"
