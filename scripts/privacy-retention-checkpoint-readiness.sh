#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${RETENTION_DB_CONTAINER:-mercasto_db_container}"
BATCH_LIMIT="${RETENTION_CHECKPOINT_BATCH_LIMIT:-100}"
AGE_DAYS="${RETENTION_CHECKPOINT_AGE_DAYS:-}"

if ! [[ "$BATCH_LIMIT" =~ ^[1-9][0-9]*$ ]] || (( BATCH_LIMIT > 1000 )); then
  echo "FAIL: RETENTION_CHECKPOINT_BATCH_LIMIT must be an integer from 1 to 1000" >&2
  exit 1
fi
if ! [[ "$AGE_DAYS" =~ ^[1-9][0-9]*$ ]] || (( AGE_DAYS > 3650 )); then
  echo "FAIL: set RETENTION_CHECKPOINT_AGE_DAYS explicitly to an integer from 1 to 3650 for replay evidence" >&2
  exit 1
fi

if [[ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)" != "true" ]]; then
  echo "FAIL: retention DB container is not running: $DB_CONTAINER" >&2
  exit 1
fi

echo "== Privacy retention checkpoint replay readiness =="
echo "mode=repeatable-read read-only aggregate-only batch_limit=$BATCH_LIMIT age_days=$AGE_DAYS"
echo "policy=engineering-evidence-only; no production pruning authorized"

failures=0
run_dataset() {
  local dataset="$1"
  local age_column="$2"
  local predicate="$3"
  local started_ns finished_ns duration_ms result

  if ! [[ "$dataset" =~ ^[a-z_]+$ && "$age_column" =~ ^[a-z_]+$ ]]; then
    echo "FAIL: invalid internal retention dataset identifier" >&2
    return 1
  fi

  started_ns="$(date +%s%N)"
  if ! result="$(docker exec -i "$DB_CONTAINER" sh -lc \
    'psql -qAt -v ON_ERROR_STOP=1 -v batch_limit="$1" -v age_days="$2" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' \
    sh "$BATCH_LIMIT" "$AGE_DAYS" <<SQL
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY;
SET LOCAL statement_timeout = '10s';
SET LOCAL lock_timeout = '2s';

WITH first_page AS MATERIALIZED (
  SELECT id, $age_column AS age_key
  FROM $dataset
  WHERE $predicate
  ORDER BY $age_column, id
  LIMIT :batch_limit
),
replay_page AS MATERIALIZED (
  SELECT id, $age_column AS age_key
  FROM $dataset
  WHERE $predicate
  ORDER BY $age_column, id
  LIMIT :batch_limit
),
checkpoint AS MATERIALIZED (
  SELECT age_key, id
  FROM first_page
  ORDER BY age_key DESC, id DESC
  LIMIT 1
),
continuation_page AS MATERIALIZED (
  SELECT id, $age_column AS age_key
  FROM $dataset
  WHERE $predicate
    AND ($age_column, id) > (
      (SELECT age_key FROM checkpoint),
      (SELECT id FROM checkpoint)
    )
  ORDER BY $age_column, id
  LIMIT :batch_limit
),
first_stats AS (
  SELECT count(*) AS rows,
         md5(COALESCE(string_agg(id::text, ',' ORDER BY age_key, id), '')) AS fingerprint
  FROM first_page
),
replay_stats AS (
  SELECT count(*) AS rows,
         md5(COALESCE(string_agg(id::text, ',' ORDER BY age_key, id), '')) AS fingerprint
  FROM replay_page
)
SELECT '$dataset',
       first_stats.rows,
       replay_stats.rows,
       (first_stats.rows = replay_stats.rows AND first_stats.fingerprint = replay_stats.fingerprint),
       (SELECT count(*) FROM continuation_page),
       EXISTS (SELECT 1 FROM checkpoint)
FROM first_stats CROSS JOIN replay_stats;

COMMIT;
SQL
  )"; then
    echo "FAIL: dataset=$dataset checkpoint replay query failed" >&2
    return 1
  fi
  finished_ns="$(date +%s%N)"
  duration_ms=$(( (finished_ns - started_ns) / 1000000 ))

  local out_dataset page_rows replay_rows replay_match continuation_rows checkpoint_present extra
  IFS='|' read -r out_dataset page_rows replay_rows replay_match continuation_rows checkpoint_present extra <<<"$result"

  if [[ -n "${extra:-}" || "$out_dataset" != "$dataset" || ! "$page_rows" =~ ^[0-9]+$ || ! "$replay_rows" =~ ^[0-9]+$ || ! "$continuation_rows" =~ ^[0-9]+$ ]]; then
    echo "FAIL: dataset=$dataset returned malformed aggregate replay evidence" >&2
    return 1
  fi

  echo "dataset=$dataset page_rows=$page_rows replay_rows=$replay_rows replay_match=$replay_match continuation_rows=$continuation_rows checkpoint_present=$checkpoint_present duration_ms=$duration_ms"
  if [[ "$replay_match" != "t" ]]; then
    echo "FAIL: dataset=$dataset replay fingerprint mismatch" >&2
    failures=$((failures + 1))
  fi
  if (( page_rows > 0 )) && [[ "$checkpoint_present" != "t" ]]; then
    echo "FAIL: dataset=$dataset failed to produce a checkpoint for a non-empty page" >&2
    failures=$((failures + 1))
  fi
}
age_predicate='created_at < now() - make_interval(days => :age_days)'
run_dataset "ad_impressions" "created_at" "$age_predicate"
run_dataset "ad_views" "created_at" "$age_predicate"
run_dataset "ad_clicks" "created_at" "$age_predicate"
run_dataset "contact_clicks" "created_at" "$age_predicate"
run_dataset "banner_impressions" "created_at" "$age_predicate"
run_dataset "email_trackings" "created_at" "$age_predicate"
run_dataset "user_notifications" "created_at" "$age_predicate AND is_read = TRUE"
run_dataset "personal_access_tokens" "expires_at" "expires_at IS NOT NULL AND expires_at < now()"

if (( failures > 0 )); then
  echo "privacy retention checkpoint replay readiness FAILED with $failures issue(s)" >&2
  exit 1
fi

echo "privacy retention checkpoint replay readiness OK"
