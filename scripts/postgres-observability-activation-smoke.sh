#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${POSTGRES_OBSERVABILITY_DB_CONTAINER:-mercasto_db_container}"

echo "== PostgreSQL observability activation smoke =="
state="$(docker exec -i "$DB_CONTAINER" sh -lc 'psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" -At' <<'SQL'
SELECT
  (position('pg_stat_statements' in current_setting('shared_preload_libraries')) > 0)::int
  || '|' || current_setting('track_io_timing')
  || '|' || EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements')::text;
SELECT (count(*) >= 0)::text FROM pg_stat_statements;
SQL
)"

first="$(printf '%s\n' "$state" | sed -n '1p')"
second="$(printf '%s\n' "$state" | sed -n '2p')"
[[ "$first" == "1|on|true" && "$second" == "true" ]] || {
  echo "PostgreSQL observability activation mismatch: ${first}|${second}" >&2
  exit 1
}
echo "pg_stat_statements=active track_io_timing=on query_profile=readable"
