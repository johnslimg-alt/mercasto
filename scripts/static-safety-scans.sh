#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Mercasto static safety scans =="

bash scripts/cache-policy-scan.sh
bash scripts/session-config-scan.sh
bash scripts/payment-retention-scan.sh
bash scripts/payment-webhook-idempotency-scan.sh
bash scripts/media-upload-validation-scan.sh

echo "static safety scans OK"
