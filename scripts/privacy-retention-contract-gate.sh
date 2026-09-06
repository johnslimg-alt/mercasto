#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN="scripts/privacy-retention-dry-run.sh"
POLICY="docs/ops/PRIVACY_RETENTION_DRAFT_2026-08-07.md"
APPROVAL="docs/ops/PRIVACY_RETENTION_APPROVAL_PACKET_2026-09-06.md"
INDEX_READY="scripts/privacy-retention-index-readiness.sh"
PLAN_READY="scripts/privacy-retention-plan-readiness.sh"

echo "== Privacy retention dry-run contract gate =="
test -x "$DRY_RUN"
test -f "$POLICY"
test -f "$APPROVAL"
test -x "$INDEX_READY"
test -x "$PLAN_READY"
bash -n "$INDEX_READY"
bash -n "$PLAN_READY"
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

grep -qF 'BEGIN TRANSACTION READ ONLY;' "$PLAN_READY"
grep -qF 'EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)' "$PLAN_READY"
grep -qF 'RETENTION_PLAN_BATCH_LIMIT:-500' "$PLAN_READY"
grep -qF 'BATCH_LIMIT > 5000' "$PLAN_READY"
grep -qF 'RETENTION_PLAN_AGE_DAYS:-}' "$PLAN_READY"
grep -qF 'AGE_DAYS > 3650' "$PLAN_READY"
grep -qF 'WHERE is_read = TRUE' "$PLAN_READY"
grep -qF 'WHERE expires_at IS NOT NULL' "$PLAN_READY"
grep -qF 'AND expires_at < now()' "$PLAN_READY"
for excluded in payments ad_moderation_decisions user_consents users; do
  if grep -Eq "(FROM|JOIN)[[:space:]]+$excluded([[:space:];]|$)" "$PLAN_READY"; then
    echo "FAIL: $excluded must stay outside the engineering candidate pruning plan" >&2
    exit 1
  fi
done
if grep -Eiq '^[[:space:]]*(delete|update|insert|truncate|drop|alter|create|grant|revoke|vacuum|refresh|copy)[[:space:]]' "$PLAN_READY"; then
  echo "FAIL: privacy retention plan readiness contains a mutating SQL statement" >&2
  exit 1
fi

echo "privacy retention dry-run contract gate OK"
