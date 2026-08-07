#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${POSTGRES_OBSERVABILITY_DB_CONTAINER:-mercasto_db_container}"

echo "== PostgreSQL observability health watch =="
bash "$(dirname "$0")/postgres-observability-activation-smoke.sh"

metrics="$(docker exec -i "$DB_CONTAINER" sh -lc 'psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" -Atq -F "|"' <<'SQL'
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';
WITH activity AS (
  SELECT
    count(*) FILTER (WHERE backend_type = 'client backend') AS connections,
    count(*) FILTER (WHERE backend_type = 'client backend' AND wait_event_type = 'Lock') AS lock_waiters,
    count(*) FILTER (WHERE backend_type = 'client backend' AND xact_start IS NOT NULL AND now() - xact_start > interval '60 seconds') AS long_xacts,
    count(*) FILTER (WHERE backend_type = 'client backend' AND state = 'idle in transaction') AS idle_in_tx
  FROM pg_stat_activity
), limits AS (
  SELECT setting::integer AS max_connections
  FROM pg_settings
  WHERE name = 'max_connections'
), table_health AS (
  SELECT
    count(*) FILTER (
      WHERE n_dead_tup >= 1000
        AND 100.0 * n_dead_tup / GREATEST(n_live_tup + n_dead_tup, 1) >= 25
    ) AS dead_pressure_tables,
    count(*) FILTER (
      WHERE n_dead_tup >= 500
        AND (last_autovacuum IS NULL OR now() - last_autovacuum > interval '21 days')
    ) AS autovacuum_lag_tables
  FROM pg_stat_user_tables
), unmanaged_usage AS (
  SELECT count(*) AS statement_ids, COALESCE(sum(calls), 0)::bigint AS calls
  FROM pg_stat_statements
  WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    AND query ~* '(real_estate_developments|category_names_backup_20260704|blacklist)'
)
SELECT activity.connections,
       limits.max_connections,
       round(100.0 * activity.connections / GREATEST(limits.max_connections, 1), 2),
       activity.lock_waiters,
       activity.long_xacts,
       activity.idle_in_tx,
       table_health.dead_pressure_tables,
       table_health.autovacuum_lag_tables,
       unmanaged_usage.statement_ids,
       unmanaged_usage.calls
FROM activity CROSS JOIN limits CROSS JOIN table_health CROSS JOIN unmanaged_usage;
COMMIT;
SQL
)"

row="$(printf '%s\n' "$metrics" | grep -E '^[0-9]+\|[0-9]+\|[0-9]+([.][0-9]+)?\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+\|[0-9]+$' | tail -1)"
[[ -n "$row" ]] || { echo "PostgreSQL observability metrics row missing" >&2; exit 1; }
IFS='|' read -r connections max_connections saturation lock_waiters long_xacts idle_in_tx dead_pressure autovacuum_lag unmanaged_statement_ids unmanaged_calls <<< "$row"

echo "connections=${connections}/${max_connections} saturation_pct=${saturation} lock_waiters=${lock_waiters} long_xacts=${long_xacts} idle_in_tx=${idle_in_tx} dead_pressure_tables=${dead_pressure} autovacuum_lag_tables=${autovacuum_lag} unmanaged_statement_ids=${unmanaged_statement_ids} unmanaged_calls=${unmanaged_calls}"

fail=0
awk -v value="$saturation" 'BEGIN { exit !(value >= 80) }' && { echo "FAIL: connection saturation is at least 80%" >&2; fail=1; } || true
[[ "$lock_waiters" -eq 0 ]] || { echo "FAIL: lock waiters detected" >&2; fail=1; }
[[ "$long_xacts" -eq 0 ]] || { echo "FAIL: transactions older than 60 seconds detected" >&2; fail=1; }
[[ "$idle_in_tx" -eq 0 ]] || { echo "FAIL: idle-in-transaction sessions detected" >&2; fail=1; }
[[ "$dead_pressure" -eq 0 ]] || { echo "FAIL: dead-tuple pressure threshold exceeded" >&2; fail=1; }
[[ "$autovacuum_lag" -eq 0 ]] || { echo "FAIL: autovacuum lag threshold exceeded" >&2; fail=1; }
[[ "$unmanaged_statement_ids" -eq 0 && "$unmanaged_calls" -eq 0 ]] || { echo "FAIL: tracked runtime SQL references an unmanaged production table" >&2; fail=1; }

(( fail == 0 )) || exit 1
echo "PostgreSQL observability health watch OK"
