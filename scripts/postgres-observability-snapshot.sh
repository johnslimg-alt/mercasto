#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${POSTGRES_OBSERVABILITY_DB_CONTAINER:-mercasto_db_container}"

echo "== PostgreSQL privacy-safe observability snapshot =="
echo "mode=read-only aggregate-only"

docker exec -i "$DB_CONTAINER" sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' <<'SQL'
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

SELECT name, setting, unit, context, pending_restart
FROM pg_settings
WHERE name IN (
  'shared_preload_libraries',
  'track_io_timing',
  'log_min_duration_statement',
  'log_statement',
  'max_connections',
  'autovacuum',
  'track_activity_query_size'
)
ORDER BY name;

SELECT EXISTS(
  SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
) AS pg_stat_statements_installed;

SELECT count(*) AS total_connections,
       count(*) FILTER (WHERE state = 'active') AS active,
       count(*) FILTER (WHERE wait_event_type = 'Lock') AS waiting_on_lock,
       count(*) FILTER (WHERE xact_start IS NOT NULL AND now() - xact_start > interval '30 seconds') AS xact_over_30s,
       count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database();

SELECT datname, stats_reset
FROM pg_stat_database
WHERE datname = current_database();

SELECT relname,
       n_live_tup,
       n_dead_tup,
       round(100.0 * n_dead_tup / GREATEST(n_live_tup + n_dead_tup, 1), 2) AS dead_pct,
       last_autovacuum,
       last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC, relname
LIMIT 20;

SELECT indexrelname AS index_name,
       idx_scan,
       idx_tup_read,
       idx_tup_fetch,
       pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC, indexrelname
LIMIT 30;

WITH fks AS (
  SELECT c.oid, c.conrelid, c.conname, c.conkey
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE c.contype = 'f' AND n.nspname = 'public'
), missing AS (
  SELECT f.*
  FROM fks f
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = f.conrelid
      AND i.indisvalid
      AND i.indisready
      AND (string_to_array(i.indkey::text, ' ')::smallint[])[1:cardinality(f.conkey)] = f.conkey
  )
)
SELECT conrelid::regclass AS child_table,
       conname,
       pg_get_constraintdef(oid) AS definition
FROM missing
ORDER BY conrelid::regclass::text, conname;

COMMIT;
SQL

echo "PostgreSQL observability snapshot OK"
