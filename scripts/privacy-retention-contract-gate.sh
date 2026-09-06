#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN="scripts/privacy-retention-dry-run.sh"
POLICY="docs/ops/PRIVACY_RETENTION_DRAFT_2026-08-07.md"
APPROVAL="docs/ops/PRIVACY_RETENTION_APPROVAL_PACKET_2026-09-06.md"
INDEX_READY="scripts/privacy-retention-index-readiness.sh"

echo "== Privacy retention dry-run contract gate =="
test -x "$DRY_RUN"
test -f "$POLICY"
test -f "$APPROVAL"
test -x "$INDEX_READY"
bash -n "$INDEX_READY"
bash -n "$DRY_RUN"

grep -qF 'BEGIN TRANSACTION READ ONLY;' "$DRY_RUN"
grep -qF "SET LOCAL statement_timeout = '10s';" "$DRY_RUN"
grep -qF "SET LOCAL lock_timeout = '2s';" "$DRY_RUN"
for table in ad_impressions ad_views ad_clicks contact_clicks banner_impressions user_notifications ad_moderation_decisions email_trackings users user_consents personal_access_tokens payments; do
  grep -qF "$table" "$DRY_RUN"
done
grep -qF 'rows_with_raw_ip' "$DRY_RUN"
grep -qF 'rows_with_pseudonymous_fingerprint' "$DRY_RUN"

if grep -Eiq '(^|[^[:alnum:]_])(delete|update|insert|truncate|drop|alter|create|grant|revoke|vacuum|analyze|refresh|copy)[[:space:]]' "$DRY_RUN"; then
  echo "FAIL: privacy retention dry run contains a mutating SQL verb" >&2
  exit 1
fi

grep -qF 'PENDING LEGAL/OWNER' "$POLICY"
grep -qF 'NO PRODUCTION PRUNING IS AUTHORIZED' "$POLICY"
grep -qF 'offsite-backup-smoke.sh' "$POLICY"
grep -qF 'PENDING LEGAL/OWNER' "$APPROVAL"
grep -qF 'NO PRODUCTION PRUNING IS AUTHORIZED' "$APPROVAL"
grep -qF 'NO_LEADING_INDEX' "$APPROVAL"
grep -qF 'BEGIN TRANSACTION READ ONLY;' "$INDEX_READY"
grep -qF 'leading_age_indexes' "$INDEX_READY"
if grep -Eiq '(^|[^[:alnum:]_])(delete|update|insert|truncate|drop|alter|create|grant|revoke|vacuum|analyze|refresh|copy)[[:space:]]' "$INDEX_READY"; then
  echo "FAIL: privacy retention index readiness contains a mutating SQL verb" >&2
  exit 1
fi

echo "privacy retention dry-run contract gate OK"
