#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${RETENTION_DB_CONTAINER:-mercasto_db_container}"

echo "== Privacy retention aggregate dry run =="
echo "mode=read-only aggregate-only"

docker exec -i "$DB_CONTAINER" sh -lc 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' <<'SQL'
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

SELECT 'ad_impressions' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_address ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_address LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_address ~ '^[0-9a-f]{45}$' OR ip_address ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM ad_impressions;

SELECT 'ad_views' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_address ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_address LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_address ~ '^[0-9a-f]{45}$' OR ip_address ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM ad_views;

SELECT 'ad_clicks' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_address ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_address LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_address ~ '^[0-9a-f]{45}$' OR ip_address ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM ad_clicks;

SELECT 'contact_clicks' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_address ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_address LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_address ~ '^[0-9a-f]{45}$' OR ip_address ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM contact_clicks;

SELECT 'banner_impressions' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_address ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_address LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_address ~ '^[0-9a-f]{45}$' OR ip_address ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM banner_impressions;

SELECT 'user_notifications' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE NOT is_read) AS protected_unread,
       count(*) FILTER (WHERE created_at < now() - interval '30 days' AND NOT is_read) AS protected_unread_older_30d
FROM user_notifications;

SELECT 'ad_moderation_decisions' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE metadata IS NOT NULL) AS rows_with_metadata
FROM ad_moderation_decisions;

SELECT 'email_trackings' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_address ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_address LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_address ~ '^[0-9a-f]{45}$' OR ip_address ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM email_trackings;

SELECT 'users.ip_address' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_address ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_address LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_address ~ '^[0-9a-f]{45}$' OR ip_address ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM users;

SELECT 'user_consents.ip_hash' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '30 days') AS older_30d,
       count(*) FILTER (WHERE created_at < now() - interval '90 days') AS older_90d,
       count(*) FILTER (WHERE ip_hash ~ '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' OR ip_hash LIKE '%:%') AS rows_with_raw_ip,
       count(*) FILTER (WHERE ip_hash ~ '^[0-9a-f]{45}$' OR ip_hash ~ '^[0-9a-f]{64}$') AS rows_with_pseudonymous_fingerprint
FROM user_consents;

SELECT 'personal_access_tokens' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < now()) AS expired,
       count(*) FILTER (WHERE last_used_at IS NULL) AS never_used,
       count(*) FILTER (WHERE created_at < now() - interval '90 days' AND last_used_at IS NULL) AS never_used_older_90d
FROM personal_access_tokens;

SELECT 'payments' AS dataset,
       count(*) AS total,
       count(*) FILTER (WHERE created_at < now() - interval '365 days') AS older_365d
FROM payments;

COMMIT;
SQL

echo "privacy retention aggregate dry run OK"
