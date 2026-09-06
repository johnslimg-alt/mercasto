#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${SCHEMA_DEPENDENCY_DB_CONTAINER:-mercasto_db_container}"
TABLE="real_estate_developments"

echo "== Unmanaged real_estate_developments dependency scan =="
echo "mode=read-only aggregate-and-reference-only"

echo "-- runtime PostgreSQL statement IDs/calls --"
docker exec -i "$DB_CONTAINER" sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atq -F "|"' <<'SQL'
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
WITH hits AS (
  SELECT queryid, calls
  FROM pg_stat_statements
  WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    AND query ~* 'real_estate_developments'
    AND query !~* 'pg_stat_statements'
)
SELECT count(*) AS statement_ids, COALESCE(sum(calls), 0)::bigint AS calls FROM hits;
COMMIT;
SQL

echo "-- repository references --"
find . -xdev \
  \( -path './.git' -o -path './backend/vendor' -o -path './node_modules' -o -path './postgres-data' -o -path './postgres-backups' \) -prune -o \
  -type f -print0 2>/dev/null \
  | xargs -0 -r grep -Il "$TABLE" 2>/dev/null \
  | sort

echo "-- host scheduler/service references --"
find /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly /etc/systemd/system \
  -type f -print0 2>/dev/null \
  | xargs -0 -r grep -Il "$TABLE" 2>/dev/null \
  | sort || true

echo "-- active container command references --"
docker ps --format '{{.Names}}' | while read -r container; do
  command_shape="$(docker inspect -f '{{json .Config.Cmd}} {{json .Config.Entrypoint}}' "$container" 2>/dev/null || true)"
  case "$command_shape" in
    *real_estate_developments*) echo "$container" ;;
  esac
done

echo "unmanaged dependency scan complete"
