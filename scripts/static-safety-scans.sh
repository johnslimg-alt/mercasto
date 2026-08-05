#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Mercasto static safety scans =="

bash scripts/repository-sensitive-artifact-scan.sh
bash scripts/security-audit-gate.sh
bash scripts/launch-readiness-contract-gate.sh
bash scripts/seo-route-shell-gate.sh
bash scripts/geo-source-pages-gate.sh
bash scripts/crawler-policy-gate.sh
bash scripts/catalog-index-hygiene-gate.sh
bash scripts/seo-weekly-measurement-gate.sh
bash scripts/admin-seo-measurement-gate.sh
bash scripts/analytics-csp-gate.sh
bash scripts/e2e-fixture-safety-gate.sh
bash scripts/isolated-launch-e2e-gate.sh
bash scripts/smoke-tempfile-safety-gate.sh
bash scripts/publish-taxonomy-gate.sh
bash scripts/edit-ad-contract-gate.sh
bash scripts/paid-renewal-contract-gate.sh
bash scripts/cache-policy-scan.sh
bash scripts/session-config-scan.sh
bash scripts/csrf-session-contract-gate.sh
bash scripts/origin-edge-security-gate.sh
bash scripts/payment-retention-scan.sh
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
bash scripts/design-token-contract-gate.sh
bash scripts/conversion-journey-gate.sh
bash scripts/auth-account-gate.sh
bash scripts/attribute-flow-gate.sh
bash scripts/otp-abuse-control-gate.sh

echo "static safety scans OK"
