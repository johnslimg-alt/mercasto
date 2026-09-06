#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${RETENTION_DB_CONTAINER:-mercasto_db_container}"
BATCH_LIMIT="${RETENTION_PLAN_BATCH_LIMIT:-500}"
AGE_DAYS="${RETENTION_PLAN_AGE_DAYS:-}"

if ! [[ "$BATCH_LIMIT" =~ ^[1-9][0-9]*$ ]] || (( BATCH_LIMIT > 5000 )); then
  echo "FAIL: RETENTION_PLAN_BATCH_LIMIT must be an integer from 1 to 5000" >&2
  exit 1
fi
if ! [[ "$AGE_DAYS" =~ ^[1-9][0-9]*$ ]] || (( AGE_DAYS > 3650 )); then
  echo "FAIL: set RETENTION_PLAN_AGE_DAYS explicitly to an integer from 1 to 3650 for planner evidence" >&2
  exit 1
fi

echo "== Privacy retention bounded-plan readiness =="
echo "mode=read-only explain-only batch_limit=$BATCH_LIMIT age_days=$AGE_DAYS"
echo "policy=engineering-candidate-only; no production pruning authorized"

docker exec -i "$DB_CONTAINER" sh -lc \
  'psql -v ON_ERROR_STOP=1 -v batch_limit="$1" -v age_days="$2" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' sh "$BATCH_LIMIT" "$AGE_DAYS" <<'SQL'
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

\echo 'dataset=ad_impressions candidate=explicit-age'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM ad_impressions
WHERE created_at < now() - make_interval(days => :age_days)
ORDER BY created_at, id
LIMIT :batch_limit;

\echo 'dataset=ad_views candidate=explicit-age'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM ad_views
WHERE created_at < now() - make_interval(days => :age_days)
ORDER BY created_at, id
LIMIT :batch_limit;

\echo 'dataset=ad_clicks candidate=explicit-age'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM ad_clicks
WHERE created_at < now() - make_interval(days => :age_days)
ORDER BY created_at, id
LIMIT :batch_limit;

\echo 'dataset=contact_clicks candidate=explicit-age'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM contact_clicks
WHERE created_at < now() - make_interval(days => :age_days)
ORDER BY created_at, id
LIMIT :batch_limit;

\echo 'dataset=banner_impressions candidate=explicit-age'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM banner_impressions
WHERE created_at < now() - make_interval(days => :age_days)
ORDER BY created_at, id
LIMIT :batch_limit;

\echo 'dataset=email_trackings candidate=explicit-age'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM email_trackings
WHERE created_at < now() - make_interval(days => :age_days)
ORDER BY created_at, id
LIMIT :batch_limit;

\echo 'dataset=user_notifications candidate=read-only-explicit-age'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM user_notifications
WHERE is_read = TRUE
  AND created_at < now() - make_interval(days => :age_days)
ORDER BY created_at, id
LIMIT :batch_limit;

\echo 'dataset=personal_access_tokens candidate=expired-only'
EXPLAIN (ANALYZE FALSE, BUFFERS FALSE)
SELECT id FROM personal_access_tokens
WHERE expires_at IS NOT NULL
  AND expires_at < now()
ORDER BY expires_at, id
LIMIT :batch_limit;

COMMIT;
SQL

echo "privacy retention bounded-plan readiness OK"
