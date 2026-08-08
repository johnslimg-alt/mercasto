#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Mercasto static safety scans =="

bash scripts/repository-sensitive-artifact-scan.sh
bash scripts/repository-sensitive-artifact-scan.test.sh
bash scripts/normalize-route-inventory.test.sh
bash scripts/route-inventory-doc-gate.sh
node scripts/self-hosted-pr-safety.mjs
node --test scripts/self-hosted-pr-safety.test.mjs
bash scripts/official-actions-node24-gate.sh
bash scripts/official-actions-node24-gate.test.sh
bash scripts/security-audit-gate.sh
bash scripts/launch-readiness-contract-gate.sh
bash scripts/seo-route-shell-gate.sh
node scripts/sitemap-shell-contract.mjs
bash scripts/geo-source-pages-gate.sh
bash scripts/crawler-policy-gate.sh
bash scripts/catalog-index-hygiene-gate.sh
bash scripts/catalog-reference-integrity-gate.sh
bash scripts/seo-weekly-measurement-gate.sh
bash scripts/seo-url-inspection-gate.sh
bash scripts/backend-ai-provider-boundary-gate.sh
bash scripts/admin-seo-measurement-gate.sh
bash scripts/analytics-csp-gate.sh
bash scripts/e2e-fixture-safety-gate.sh
bash scripts/isolated-launch-e2e-gate.sh
bash scripts/mcp-production-retirement-gate.sh
bash scripts/smoke-tempfile-safety-gate.sh
bash scripts/publish-taxonomy-gate.sh
bash scripts/edit-ad-contract-gate.sh
bash scripts/paid-renewal-contract-gate.sh
bash scripts/cache-policy-scan.sh
bash scripts/session-config-scan.sh
node --test scripts/session-cookie-smoke.test.mjs
node --test scripts/security-header-smoke.test.mjs
node --test scripts/public-production-watch.test.mjs
node --test scripts/search-query-plan-contract.test.mjs
node --test scripts/vector-storage-contract.test.mjs
node --test scripts/category-filter-smoke.test.mjs
node --test scripts/server-operator-deploy-cache.test.mjs
node --test scripts/manual-server-gate-self-hosted.test.mjs
node --test scripts/automerge-workflow-guard.test.mjs
node --test scripts/hosted-workflow-timeout-guard.test.mjs
node --test scripts/workflow-concurrency-guard.test.mjs
node --test scripts/seo-audit-request.test.mjs
bash scripts/csrf-session-contract-gate.sh
bash scripts/origin-edge-security-gate.sh
bash scripts/offsite-backup-contract-gate.sh
bash scripts/schema-drift-contract-gate.sh
bash scripts/postgres-observability-contract-gate.sh
bash scripts/payment-retention-scan.sh
bash scripts/privacy-retention-contract-gate.sh
bash scripts/payment-payload-privacy-gate.sh
bash scripts/payment-webhook-idempotency-scan.sh
bash scripts/media-upload-validation-scan.sh
bash scripts/xml-upload-security-gate.sh
bash scripts/search-alert-flow-gate.sh
bash scripts/chat-api-security-gate.sh
bash scripts/chat-ui-flow-gate.sh
bash scripts/listing-lifecycle-gate.sh
bash scripts/ad-activation-lifecycle-gate.sh
bash scripts/moderation-pipeline-gate.sh
bash scripts/seller-reactivation-reminder-gate.sh
bash scripts/seller-correction-flow-gate.sh
bash scripts/admin-request-changes-gate.sh
bash scripts/web-push-vapid-gate.sh
bash scripts/supply-readiness-gate.sh
bash scripts/location-search-gate.sh
bash scripts/registration-consent-contract-gate.sh
bash scripts/funnel-analytics-contract-gate.sh
node --test scripts/buyer-nudge-contract-gate.test.mjs
bash scripts/mobile-app-association-gate.sh
bash scripts/design-token-contract-gate.sh
bash scripts/conversion-journey-gate.sh
bash scripts/auth-account-gate.sh
node --test scripts/ai-brand-positioning.test.mjs
bash scripts/attribute-flow-gate.sh
bash scripts/otp-abuse-control-gate.sh

bash scripts/legacy-secret-fallback-gate.sh
bash scripts/internal-service-exposure-watch.test.sh
echo "static safety scans OK"
