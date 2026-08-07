#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${POSTGRES_OBSERVABILITY_DB_CONTAINER:-mercasto_db_container}"

echo "== PostgreSQL queryid-only profile =="
echo "mode=read-only aggregate-only no-query-text"

docker exec -i "$DB_CONTAINER" sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' <<'SQL'
-- Run only after pg_stat_statements is explicitly enabled and validated.
-- Intentionally outputs queryid + aggregates, never the normalized SQL text itself.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';

SELECT queryid, calls, round(total_exec_time::numeric, 2) AS total_exec_ms,
       round(mean_exec_time::numeric, 2) AS mean_exec_ms, rows,
       shared_blks_hit, shared_blks_read, temp_blks_written
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY total_exec_time DESC
LIMIT 20;

SELECT queryid, calls, round(total_exec_time::numeric, 2) AS total_exec_ms,
       round(mean_exec_time::numeric, 2) AS mean_exec_ms, rows,
       shared_blks_hit, shared_blks_read, temp_blks_written
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND calls >= 5
ORDER BY mean_exec_time DESC
LIMIT 20;

SELECT queryid, calls, round(total_exec_time::numeric, 2) AS total_exec_ms,
       round(mean_exec_time::numeric, 2) AS mean_exec_ms, rows,
       shared_blks_hit, shared_blks_read, temp_blks_written
FROM pg_stat_statements
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY calls DESC
LIMIT 20;

COMMIT;
SQL

echo "PostgreSQL queryid-only profile OK"
