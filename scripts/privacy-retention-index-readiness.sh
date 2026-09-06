#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${RETENTION_DB_CONTAINER:-mercasto_db_container}"

echo "== Privacy retention index readiness =="
echo "mode=read-only metadata-only"

docker exec -i "$DB_CONTAINER" sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' <<'SQL'
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

WITH targets(dataset, table_name, age_column) AS (
  VALUES
    ('ad_impressions','ad_impressions','created_at'),
    ('ad_views','ad_views','created_at'),
    ('ad_clicks','ad_clicks','created_at'),
    ('contact_clicks','contact_clicks','created_at'),
    ('banner_impressions','banner_impressions','created_at'),
    ('user_notifications','user_notifications','created_at'),
    ('ad_moderation_decisions','ad_moderation_decisions','created_at'),
    ('email_trackings','email_trackings','created_at'),
    ('users','users','created_at'),
    ('user_consents','user_consents','created_at'),
    ('personal_access_tokens.expired','personal_access_tokens','expires_at'),
    ('personal_access_tokens.never_used','personal_access_tokens','created_at'),
    ('payments','payments','created_at')
), readiness AS (
  SELECT t.dataset,
         t.age_column,
         count(i.indexrelid) FILTER (WHERE a.attname = t.age_column) AS leading_age_indexes
  FROM targets t
  LEFT JOIN pg_class c ON c.relname = t.table_name
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  LEFT JOIN pg_index i ON i.indrelid = c.oid AND i.indisvalid AND i.indisready
  LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = i.indkey[0]
  GROUP BY t.dataset, t.age_column
)
SELECT dataset,
       age_column,
       leading_age_indexes,
       CASE WHEN leading_age_indexes > 0 THEN 'INDEXED' ELSE 'NO_LEADING_INDEX' END AS readiness
FROM readiness
ORDER BY dataset;

COMMIT;
SQL

echo "privacy retention index readiness OK"
