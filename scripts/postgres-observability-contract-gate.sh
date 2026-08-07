#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SNAPSHOT="scripts/postgres-observability-snapshot.sh"
PROFILE="scripts/postgres-query-profile.sh"
STAGED="ops/postgres/pg-stat-statements.staged.conf"
RUNBOOK="docs/ops/POSTGRES_OBSERVABILITY_STAGE_2026-08-07.md"

echo "== PostgreSQL observability contract gate =="
for file in "$SNAPSHOT" "$PROFILE" "$STAGED" "$RUNBOOK"; do test -f "$file"; done
test -x "$SNAPSHOT"
bash -n "$SNAPSHOT"

grep -qF 'BEGIN TRANSACTION READ ONLY;' "$SNAPSHOT"
grep -qF "SET LOCAL statement_timeout = '10s';" "$SNAPSHOT"
grep -qF 'pg_stat_activity' "$SNAPSHOT"
grep -qF 'pg_stat_user_tables' "$SNAPSHOT"
grep -qF 'pg_stat_user_indexes' "$SNAPSHOT"
grep -qF "c.contype = 'f'" "$SNAPSHOT"
if grep -Eiq 'pg_stat_activity[^;]*query|select[^;]*[[:space:],]query[[:space:],]' "$SNAPSHOT"; then
  echo "FAIL: observability snapshot must not output SQL text" >&2
  exit 1
fi

grep -qF 'queryid' "$PROFILE"
if grep -Eiq 'select[^;]*[[:space:],]query([[:space:],]|$)' "$PROFILE"; then
  echo "FAIL: query profile must export queryid/aggregates, not SQL text" >&2
  exit 1
fi

grep -qF "shared_preload_libraries = 'pg_stat_statements'" "$STAGED"
grep -qF "log_statement = 'none'" "$STAGED"
grep -qF 'log_min_duration_statement = -1' "$STAGED"
grep -qF 'STAGED ONLY' "$STAGED"
if grep -RIl --include='docker-compose*.yml' --include='Dockerfile*' 'pg-stat-statements.staged.conf' . | grep -q .; then
  echo "FAIL: staged PostgreSQL restart config is wired into runtime" >&2
  exit 1
fi

grep -qF 'NOT APPLIED TO PRODUCTION' "$RUNBOOK"
grep -qF 'offsite-backup-smoke.sh' "$RUNBOOK"
grep -qF 'final 48-hour' "$RUNBOOK"

echo "PostgreSQL observability contract gate OK"
