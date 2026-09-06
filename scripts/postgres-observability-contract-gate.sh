#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SNAPSHOT="scripts/postgres-observability-snapshot.sh"
PROFILE="scripts/postgres-query-profile.sh"
ACTIVATION="scripts/postgres-observability-activation-smoke.sh"
HEALTH="scripts/postgres-observability-health.sh"
WATCH=".github/workflows/postgres-observability-watch.yml"
REFERENCE="ops/postgres/pg-stat-statements.reference.conf"
RUNBOOK="docs/ops/POSTGRES_OBSERVABILITY_2026-08-07.md"
MIGRATION="backend/database/migrations/2026_08_07_063000_enable_pg_stat_statements_extension.php"
COMPOSE="docker-compose.yml"
SERVER="scripts/server-operator.sh"

echo "== PostgreSQL observability contract gate =="
for file in "$SNAPSHOT" "$PROFILE" "$ACTIVATION" "$HEALTH" "$WATCH" "$REFERENCE" "$RUNBOOK" "$MIGRATION" "$COMPOSE"; do test -f "$file"; done
for file in "$SNAPSHOT" "$PROFILE" "$ACTIVATION" "$HEALTH"; do test -x "$file"; bash -n "$file"; done

grep -qF 'BEGIN TRANSACTION READ ONLY;' "$SNAPSHOT"
grep -qF "SET LOCAL statement_timeout = '10s';" "$SNAPSHOT"
grep -qF 'pg_stat_activity' "$SNAPSHOT"
grep -qF 'pg_stat_user_tables' "$SNAPSHOT"
grep -qF 'pg_stat_user_indexes' "$SNAPSHOT"
if grep -Eiq 'pg_stat_activity[^;]*query|select[^;]*[[:space:],]query[[:space:],]' "$SNAPSHOT"; then
  echo "FAIL: observability snapshot must not output SQL text" >&2
  exit 1
fi

grep -qF 'queryid' "$PROFILE"
if grep -Eiq 'select[^;]*[[:space:],]query([[:space:],]|$)' "$PROFILE"; then
  echo "FAIL: query profile must export queryid/aggregates, not SQL text" >&2
  exit 1
fi

for setting in \
  'shared_preload_libraries=pg_stat_statements' \
  'compute_query_id=auto' \
  'track_io_timing=on' \
  'pg_stat_statements.track=top' \
  'pg_stat_statements.track_utility=off' \
  'pg_stat_statements.save=on' \
  'pg_stat_statements.max=5000' \
  'log_statement=none' \
  'log_min_duration_statement=-1'; do
  grep -qF "$setting" "$COMPOSE"
done

grep -qF 'CREATE EXTENSION IF NOT EXISTS pg_stat_statements' "$MIGRATION"
grep -qF "current_setting('shared_preload_libraries')" "$ACTIVATION"
grep -qF "pg_stat_statements=active" "$ACTIVATION"
grep -qF 'BEGIN TRANSACTION READ ONLY;' "$HEALTH"
grep -qF "interval '60 seconds'" "$HEALTH"
grep -qF 'value >= 80' "$HEALTH"
grep -qF 'n_dead_tup >= 1000' "$HEALTH"
grep -qF '>= 25' "$HEALTH"
grep -qF 'n_dead_tup >= 500' "$HEALTH"
grep -qF "interval '21 days'" "$HEALTH"
grep -qF 'real_estate_developments' "$HEALTH"
grep -qF 'category_names_backup_20260704' "$HEALTH"
grep -qF 'blacklist' "$HEALTH"
grep -qF 'pg_stat_statements' "$HEALTH"
grep -qF "query !~* 'pg_stat_statements'" "$HEALTH"
grep -qF 'unmanaged_statement_ids' "$HEALTH"
if grep -Eiq 'pg_stat_activity[^;]*query|select[^;]*[[:space:],]query[[:space:],]' "$HEALTH"; then
  echo "FAIL: health watch must not output SQL text" >&2
  exit 1
fi
grep -qF "cron: '23 */6 * * *'" "$WATCH"
grep -qF 'runs-on: [self-hosted, linux, docker]' "$WATCH"
grep -qF '/var/www/mercasto/scripts/postgres-observability-health.sh' "$WATCH"
grep -qF 'POSTGRES_OBSERVABILITY_WATCH_INCIDENT' "$WATCH"
if grep -qF 'actions/checkout' "$WATCH"; then
  echo "FAIL: trusted self-hosted database watch must not checkout workflow code" >&2
  exit 1
fi
grep -qF 'bash scripts/postgres-observability-activation-smoke.sh' "$SERVER"
grep -qF 'ACTIVE AFTER DEPLOYMENT' "$RUNBOOK"
grep -qF 'offsite-backup-smoke.sh' "$RUNBOOK"
grep -qF 'final 48-hour' "$RUNBOOK"

echo "PostgreSQL observability contract gate OK"
