#!/usr/bin/env bash
set -euo pipefail
SCAN="scripts/real-estate-unmanaged-dependency-scan.sh"
DOC="docs/ops/PRODUCTION_SCHEMA_DRIFT_2026-08-07.md"
test -x "$SCAN"
test -f "$DOC"
bash -n "$SCAN"
grep -qF 'BEGIN TRANSACTION READ ONLY;' "$SCAN"
grep -qF 'pg_stat_statements' "$SCAN"
grep -qF "query !~* 'pg_stat_statements'" "$SCAN"
grep -qF 'real_estate_developments' "$SCAN"
if grep -Eiq '(^|[^[:alnum:]_])(delete|update|insert|truncate|drop|alter|create|grant|revoke|vacuum|analyze|refresh|copy)[[:space:]]' "$SCAN"; then
  echo "FAIL: unmanaged dependency scan contains a mutating SQL verb" >&2
  exit 1
fi
grep -qFi 'fresh runtime evidence' "$DOC"
grep -qF '0 statement IDs / 0 calls' "$DOC"
echo 'real estate unmanaged dependency contract OK'
