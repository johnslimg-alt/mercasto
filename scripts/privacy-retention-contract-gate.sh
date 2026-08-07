#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN="scripts/privacy-retention-dry-run.sh"
POLICY="docs/ops/PRIVACY_RETENTION_DRAFT_2026-08-07.md"

echo "== Privacy retention dry-run contract gate =="
test -x "$DRY_RUN"
test -f "$POLICY"
bash -n "$DRY_RUN"

grep -qF 'BEGIN TRANSACTION READ ONLY;' "$DRY_RUN"
grep -qF "SET LOCAL statement_timeout = '10s';" "$DRY_RUN"
grep -qF "SET LOCAL lock_timeout = '2s';" "$DRY_RUN"
for table in ad_impressions ad_views ad_clicks user_notifications ad_moderation_decisions email_trackings personal_access_tokens payments; do
  grep -qF "$table" "$DRY_RUN"
done

if grep -Eiq '(^|[^[:alnum:]_])(delete|update|insert|truncate|drop|alter|create|grant|revoke|vacuum|analyze|refresh|copy)[[:space:]]' "$DRY_RUN"; then
  echo "FAIL: privacy retention dry run contains a mutating SQL verb" >&2
  exit 1
fi

grep -qF 'PENDING LEGAL/OWNER' "$POLICY"
grep -qF 'NO PRODUCTION PRUNING IS AUTHORIZED' "$POLICY"
grep -qF 'offsite-backup-smoke.sh' "$POLICY"

echo "privacy retention dry-run contract gate OK"
