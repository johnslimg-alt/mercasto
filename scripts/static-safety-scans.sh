#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Mercasto static safety scans =="

bash scripts/repository-sensitive-artifact-scan.sh
bash scripts/cache-policy-scan.sh
bash scripts/session-config-scan.sh
bash scripts/payment-retention-scan.sh
bash scripts/payment-webhook-idempotency-scan.sh
bash scripts/media-upload-validation-scan.sh
bash scripts/xml-upload-security-gate.sh
bash scripts/search-alert-flow-gate.sh
bash scripts/chat-api-security-gate.sh
bash scripts/chat-ui-flow-gate.sh
bash scripts/listing-lifecycle-gate.sh
bash scripts/location-search-gate.sh
bash scripts/registration-consent-contract-gate.sh
bash scripts/funnel-analytics-contract-gate.sh
bash scripts/auth-account-gate.sh
bash scripts/attribute-flow-gate.sh
bash scripts/otp-abuse-control-gate.sh

echo "static safety scans OK"
