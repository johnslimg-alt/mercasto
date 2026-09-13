#!/usr/bin/env bash
set -euo pipefail

# Restore-verification gate.
#
# scripts/backup-freshness-smoke.sh only proves that a backup artifact exists,
# is young enough and is non-empty. It has never proved the dump can be
# restored. This gate closes that gap: it restores the newest artifact into a
# THROWAWAY container and asserts that real data actually lands in it.
#
# Isolation contract (never relaxed):
#   * the verifier is a separate container with its own anonymous volume and
#     its own credentials;
#   * it runs with --network none and publishes no host port, so it cannot
#     reach the production database even by accident;
#   * no production volume or bind mount is attached;
#   * the production database is only ever queried inside a read-only
#     transaction (default_transaction_read_only=on);
#   * nothing in BACKUP_ROOT is ever written, moved or deleted.
#
# Run with REQUIRE_RESTORE_VERIFICATION=1 in CI so a missing prerequisite is a
# hard failure instead of a silent skip.

BACKUP_ROOT="${BACKUP_ROOT:-/var/www/mercasto/postgres-backups}"
RESTORE_IMAGE="${RESTORE_IMAGE:-pgvector/pgvector:pg18}"
RESTORE_CONTAINER="${RESTORE_CONTAINER:-mercasto_restore_verify}"
RESTORE_DB="${RESTORE_DB:-mercasto_restore_verify}"
RESTORE_USER="${RESTORE_USER:-restore_verify}"
PROD_CONTAINER="${PROD_CONTAINER:-mercasto_db_container}"
PROD_DB="${PROD_DB:-mercasto}"
PROD_USER="${PROD_USER:-mercasto_user}"
REQUIRE_RESTORE_VERIFICATION="${REQUIRE_RESTORE_VERIFICATION:-0}"

# Structural floors. These are deliberately floors and not exact counts: adding
# a table is legitimate, silently losing most of the database is not.
RESTORE_MIN_TABLES="${RESTORE_MIN_TABLES:-55}"
RESTORE_MIN_ADS="${RESTORE_MIN_ADS:-1000}"
# Durable historical anchor row. It is written once and never mutated, so it is
# safe to compare against. If this payment is ever legitimately purged, move the
# anchor to another immutable historical row.
RESTORE_KNOWN_PAYMENT_ID="${RESTORE_KNOWN_PAYMENT_ID:-14}"
RESTORE_KNOWN_PAYMENT_STATUS="${RESTORE_KNOWN_PAYMENT_STATUS:-paid}"
RESTORE_KNOWN_PROVIDER_STATUS="${RESTORE_KNOWN_PROVIDER_STATUS:-paid}"

CONTAINER_STARTED=0
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-restore-verify.XXXXXX")"
RESTORE_OUT="$WORK_DIR/pg_restore.out"
RESTORE_ERR="$WORK_DIR/pg_restore.err"

say() { echo "$@"; }
fail() { echo "FAIL: $*" >&2; exit 1; }

cleanup() {
  local rc=$?
  if (( CONTAINER_STARTED == 1 )); then
    # -v removes the container's own anonymous volume with it.
    docker rm -f -v "$RESTORE_CONTAINER" >/dev/null 2>&1 || true
    say "verifier_container_removed=$RESTORE_CONTAINER"
  fi
  rm -rf "$WORK_DIR"
  return $rc
}
trap cleanup EXIT

say "== Backup restore verification =="
say "backup_root=$BACKUP_ROOT"
say "restore_image=$RESTORE_IMAGE"
say "verifier_container=$RESTORE_CONTAINER"

skip_or_fail() {
  local reason="$1"
  if [[ "$REQUIRE_RESTORE_VERIFICATION" == "1" ]]; then
    fail "$reason"
  fi
  say "restore_verification=skipped ($reason)"
  exit 0
}

# --- preflight -------------------------------------------------------------

command -v docker >/dev/null 2>&1 || skip_or_fail "docker is not available"

# Refuse to operate if a misconfiguration would point the verifier at the
# production container name. This gate must never touch production.
if [[ "$RESTORE_CONTAINER" == "$PROD_CONTAINER" ]]; then
  fail "RESTORE_CONTAINER must not be the production container ($PROD_CONTAINER)"
fi

if ! docker image inspect "$RESTORE_IMAGE" >/dev/null 2>&1; then
  skip_or_fail "restore image $RESTORE_IMAGE is not present locally; pull it before running this gate"
fi

if [[ ! -d "$BACKUP_ROOT" ]]; then
  skip_or_fail "backup root is missing"
fi

latest="$(find "$BACKUP_ROOT" -type f \( -name '*.sql' -o -name '*.dump' -o -name '*.backup' -o -name '*.gz' -o -name '*.zst' \) -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -n1 | cut -d' ' -f2- || true)"
if [[ -z "$latest" ]]; then
  skip_or_fail "no database backup artifact found"
fi

size_bytes="$(stat -c %s "$latest")"
(( size_bytes > 0 )) || fail "newest backup artifact is empty: $(basename "$latest")"

say "restore_source=$(basename "$latest")"
say "restore_source_size_bytes=$size_bytes"

# --- throwaway verifier ----------------------------------------------------

docker rm -f "$RESTORE_CONTAINER" >/dev/null 2>&1 || true

# Credentials are generated inline and never echoed. --network none, no -p.
docker run -d \
  --name "$RESTORE_CONTAINER" \
  --network none \
  --label mercasto=restore-verification \
  -e POSTGRES_USER="$RESTORE_USER" \
  -e POSTGRES_PASSWORD="$(openssl rand -hex 24)" \
  -e POSTGRES_DB="$RESTORE_DB" \
  "$RESTORE_IMAGE" >/dev/null
CONTAINER_STARTED=1

# Readiness must mean "the FINAL postmaster is accepting queries", not just
# "something answered pg_isready". The image entrypoint runs initdb behind a
# temporary server, so a bare pg_isready probe can succeed and then vanish,
# which made pg_restore fail on a closed socket. Require two consecutive
# successful queries with an unchanged postmaster start time instead.
ready=0
prev_pgstart=""
for _ in $(seq 1 90); do
  if cur_pgstart="$(docker exec "$RESTORE_CONTAINER" \
        psql -U "$RESTORE_USER" -d "$RESTORE_DB" -X -Atqc 'SELECT pg_postmaster_start_time();' 2>/dev/null)" \
     && [[ -n "$cur_pgstart" ]]; then
    if [[ "$cur_pgstart" == "$prev_pgstart" ]]; then
      ready=1
      break
    fi
    prev_pgstart="$cur_pgstart"
  else
    prev_pgstart=""
  fi
  sleep 1
done
(( ready == 1 )) || fail "verifier container did not become ready"

# Prove the isolation contract instead of assuming it.
ports="$(docker port "$RESTORE_CONTAINER" 2>/dev/null | wc -l)"
(( ports == 0 )) || fail "verifier publishes a host port; refusing to continue"
netmode="$(docker inspect "$RESTORE_CONTAINER" --format '{{.HostConfig.NetworkMode}}')"
[[ "$netmode" == "none" ]] || fail "verifier network mode is '$netmode', expected 'none'"
prod_mounts="$(docker inspect "$RESTORE_CONTAINER" --format '{{range .Mounts}}{{.Source}}{{"\n"}}{{end}}' | grep -c 'postgres-data' || true)"
(( prod_mounts == 0 )) || fail "verifier has the production data directory mounted; refusing to continue"
say "verifier_network_mode=$netmode"
say "verifier_published_ports=$ports"
say "verifier_production_mounts=$prod_mounts"

# docker cp only READS the host artifact.
docker cp "$latest" "$RESTORE_CONTAINER:/tmp/backup.dump" >/dev/null

# --- timed restore ---------------------------------------------------------

# --no-owner/--no-privileges keeps the gate independent of production role
# names; ownership and ACL fidelity are intended to match the target cluster,
# not the throwaway one.
set +e
start="$(date +%s.%N)"
docker exec "$RESTORE_CONTAINER" pg_restore \
  -U "$RESTORE_USER" -d "$RESTORE_DB" \
  --no-owner --no-privileges /tmp/backup.dump \
  >"$RESTORE_OUT" 2>"$RESTORE_ERR"
restore_rc=$?
end="$(date +%s.%N)"
set -e

restore_seconds="$(awk -v a="$start" -v b="$end" 'BEGIN { printf "%.3f", b - a }')"
stderr_lines="$(wc -l < "$RESTORE_ERR")"

say "restore_wall_seconds=$restore_seconds"
say "restore_exit_code=$restore_rc"
say "restore_stderr_lines=$stderr_lines"

if (( restore_rc != 0 )); then
  head -n 20 "$RESTORE_ERR" >&2 || true
  fail "pg_restore exited $restore_rc for $(basename "$latest")"
fi
if (( stderr_lines != 0 )); then
  head -n 20 "$RESTORE_ERR" >&2 || true
  fail "pg_restore reported $stderr_lines diagnostic line(s); a clean restore is expected"
fi

q() { docker exec "$RESTORE_CONTAINER" psql -U "$RESTORE_USER" -d "$RESTORE_DB" -X -Atq -c "$1"; }

# --- data assertions -------------------------------------------------------

uncompressed_bytes="$(docker exec "$RESTORE_CONTAINER" sh -c 'pg_restore -f - /tmp/backup.dump 2>/dev/null' | wc -c)"
db_bytes="$(q "SELECT pg_database_size('$RESTORE_DB');")"
table_count="$(q "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")"
fk_count="$(q "SELECT count(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace;")"
vector_ext="$(q "SELECT count(*) FROM pg_extension WHERE extname='vector';")"

say "dump_compressed_bytes=$size_bytes"
say "dump_uncompressed_bytes=$uncompressed_bytes"
say "restored_database_bytes=$db_bytes"
say "restored_public_base_tables=$table_count"
say "restored_fk_constraints=$fk_count"

(( table_count >= RESTORE_MIN_TABLES )) || fail "restored only $table_count public base tables (floor $RESTORE_MIN_TABLES)"
(( fk_count > 0 )) || fail "restored no foreign keys; schema looks truncated"
(( vector_ext == 1 )) || fail "pgvector extension missing from the restored schema"

row_count() { q "SELECT count(*) FROM $1;"; }

ads_rows="$(row_count ads)"
users_rows="$(row_count users)"
payments_rows="$(row_count payments)"
consents_rows="$(row_count user_consents)"

say "restored_ads_rows=$ads_rows"
say "restored_users_rows=$users_rows"
say "restored_payments_rows=$payments_rows"
say "restored_user_consents_rows=$consents_rows"

(( ads_rows >= RESTORE_MIN_ADS )) || fail "restored $ads_rows ads (floor $RESTORE_MIN_ADS)"
(( users_rows > 0 )) || fail "restored users table is empty"
(( payments_rows > 0 )) || fail "restored payments table is empty"
(( consents_rows > 0 )) || fail "restored user_consents table is empty"

# Known immutable row must survive intact.
anchor="$(q "SELECT status || '|' || coalesce(webhook_payload->>'provider_status','') FROM payments WHERE id = $RESTORE_KNOWN_PAYMENT_ID;")"
say "restored_known_payment_id=$RESTORE_KNOWN_PAYMENT_ID"
say "restored_known_payment_fingerprint=$anchor"
[[ -n "$anchor" ]] || fail "known anchor row payments.id=$RESTORE_KNOWN_PAYMENT_ID is missing from the restore"
[[ "$anchor" == "$RESTORE_KNOWN_PAYMENT_STATUS|$RESTORE_KNOWN_PROVIDER_STATUS" ]] \
  || fail "known anchor row payments.id=$RESTORE_KNOWN_PAYMENT_ID changed: got '$anchor'"

# Referential integrity: no orphaned child rows across every public FK.
orphan_sql="$(q "
SELECT string_agg(format('SELECT %L AS fk, count(*) AS orphans FROM %s ch LEFT JOIN %s pa ON (%s) WHERE %s',
  c.conname, c.conrelid::regclass, c.confrelid::regclass,
  (SELECT string_agg(format('ch.%I = pa.%I', ca.attname, pb.attname), ' AND ')
     FROM unnest(c.conkey, c.confkey) WITH ORDINALITY AS k(ck,fk,ord)
     JOIN pg_attribute ca ON ca.attrelid=c.conrelid AND ca.attnum=k.ck
     JOIN pg_attribute pb ON pb.attrelid=c.confrelid AND pb.attnum=k.fk),
  (SELECT string_agg(format('ch.%I IS NOT NULL AND pa.%I IS NULL', ca2.attname, pb2.attname), ' AND ')
     FROM unnest(c.conkey, c.confkey) WITH ORDINALITY AS k2(ck,fk,ord)
     JOIN pg_attribute ca2 ON ca2.attrelid=c.conrelid AND ca2.attnum=k2.ck
     JOIN pg_attribute pb2 ON pb2.attrelid=c.confrelid AND pb2.attnum=k2.fk)),
  E'\nUNION ALL\n' ORDER BY c.conname)
FROM pg_constraint c WHERE c.contype='f' AND c.connamespace='public'::regnamespace;")"

orphans="$(echo "$orphan_sql" | docker exec -i "$RESTORE_CONTAINER" psql -U "$RESTORE_USER" -d "$RESTORE_DB" -X -q -f - 2>/dev/null | awk 'NR<=2{next} {s+=$3} END{print s+0}')"
say "restored_orphaned_fk_rows=$orphans"
(( orphans == 0 )) || fail "restored database has $orphans orphaned foreign-key row(s)"

# --- production cross-check (report only) ----------------------------------
#
# Deliberately NON-FATAL. The restore is a snapshot taken at dump time while
# production keeps serving writes, so volatile columns legitimately drift (for
# example users.last_active_at) and a row deleted after the dump makes the
# restored count legitimately higher. Failing on that would make this gate
# flaky, which is exactly the false-signal failure this company has already
# paid for twice. Counts are still printed side by side so a human sees drift.

if docker inspect "$PROD_CONTAINER" >/dev/null 2>&1; then
  psql_prod() {
    docker exec -i "$PROD_CONTAINER" env PGOPTIONS='-c default_transaction_read_only=on' \
      psql -U "$PROD_USER" -d "$PROD_DB" -X -Atq -c "SET default_transaction_read_only = on;" -c "$1"
  }
  say "production_cross_check=read-only"
  for t in ads users payments user_consents; do
    p="$(psql_prod "SELECT count(*) FROM $t;" 2>/dev/null || echo 'unavailable')"
    r="$(row_count "$t")"
    say "rowcount_compare_${t}=restored:${r} production:${p}"
  done
  prod_anchor="$(psql_prod "SELECT status || '|' || coalesce(webhook_payload->>'provider_status','') FROM payments WHERE id = $RESTORE_KNOWN_PAYMENT_ID;" 2>/dev/null || echo 'unavailable')"
  say "known_payment_compare=restored:${anchor} production:${prod_anchor}"
  prod_tables="$(psql_prod "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>/dev/null || echo 'unavailable')"
  say "table_count_compare=restored:${table_count} production:${prod_tables}"
else
  say "production_cross_check=skipped ($PROD_CONTAINER not present)"
fi

say "restore_verification=verified"
say "backup restore verification OK"
