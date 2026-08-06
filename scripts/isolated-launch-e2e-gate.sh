#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
echo "== Isolated launch E2E gate =="
grep -qF 'E2E test users cannot be seeded in production.' backend/database/seeders/E2eTestSeeder.php
grep -qF 'E2E_ISOLATED_STACK=1' scripts/run-isolated-launch-e2e.sh
grep -qF 'PLAYWRIGHT_BASE_URL="http://127.0.0.1:$FRONTEND_PORT"' scripts/run-isolated-launch-e2e.sh
grep -qF 'OLLAMA_CONTAINER="${E2E_OLLAMA_CONTAINER:-mercasto-launch-e2e-ollama}"' scripts/run-isolated-launch-e2e.sh
grep -qF '  -e CACHE_STORE=file' scripts/run-isolated-launch-e2e.sh
grep -qF '  -e VAPID_PUBLIC_KEY=e2e-vapid-public-key' scripts/run-isolated-launch-e2e.sh
grep -qF 'VITE_API_URL="http://127.0.0.1:$API_PORT/api"' scripts/run-isolated-launch-e2e.sh
grep -qF 'VITE_DISABLE_REALTIME=true' scripts/run-isolated-launch-e2e.sh
grep -qF "VITE_DISABLE_REALTIME === 'true'" src/App.jsx
grep -qF 'pgvector/pgvector:pg18' scripts/run-isolated-launch-e2e.sh
grep -qF 'tests/e2e/auth-flow.spec.js' scripts/run-isolated-launch-e2e.sh
grep -qF 'tests/e2e/ads-lifecycle.spec.js' scripts/run-isolated-launch-e2e.sh
grep -qF 'tests/e2e/payments.spec.js' scripts/run-isolated-launch-e2e.sh
grep -qF 'suite_enabled visual' scripts/run-isolated-launch-e2e.sh
grep -qF 'capture-authenticated-ui-visual-evidence.mjs' scripts/run-isolated-launch-e2e.sh
grep -qF 'never mutate production payments' tests/e2e/payments.spec.js
node --check scripts/capture-authenticated-ui-visual-evidence.mjs
node --check scripts/clip-e2e-mock.mjs
node --check scripts/ollama-e2e-mock.mjs
bash -n scripts/run-isolated-launch-e2e.sh
echo "isolated launch E2E gate OK"
