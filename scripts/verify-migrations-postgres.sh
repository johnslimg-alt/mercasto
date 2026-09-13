#!/usr/bin/env bash
#
# verify-migrations-postgres.sh — prove a migration on the engine production runs.
#
# WHY THIS EXISTS
#   `backend/phpunit.xml` forces DB_CONNECTION=sqlite / DB_DATABASE=:memory:, so the
#   PHPUnit suite never executes the PostgreSQL DDL that production executes. A
#   migration can therefore pass every test in this repository and still be wrong on
#   PostgreSQL in ways SQLite structurally cannot express: SQLite does not enforce
#   foreign keys unless they are switched on, has no `ACCESS EXCLUSIVE`, no real
#   `ALTER COLUMN ... TYPE`, no enum types and no lock levels.
#
# WHAT IT PROVES (on a throwaway pgvector/pgvector container, never production)
#   1. up() applies cleanly on top of the pre-migration schema.
#   2. Every DDL statement the migration emitted actually took effect: the captured
#      SQL is re-checked against the resulting catalog, statement by statement.
#   3. Applying up() a second time is a schema-level and a data-level no-op.
#   4. down() runs, and the tool reports exactly what it destroyed — rows deleted,
#      columns dropped — instead of merely exiting 0.
#   5. The up() -> down() round trip restores the pre-migration schema.
#   6. Which locks the migration actually needs, measured by contention, next to the
#      production row count of each affected table, so a reviewer can judge whether
#      it will block a live marketplace.
#
# SAFETY
#   * The tool creates its own container and builds its own DSN from that container's
#     own published port. It never reads DB_* from backend/.env, so it cannot inherit
#     a production connection string.
#   * Before touching anything it asserts inet_server_addr()/inet_server_port() and
#     aborts unless the target is demonstrably the throwaway container.
#   * The container is removed on exit (trap), including on failure.
#   * Production is only ever read, and only for row counts of affected tables
#     (disable with --no-production-counts).
#   * Config keys a migration depends on are reported as SET or EMPTY. Their values
#     are never printed, because a config key can hold a credential.
#
# USAGE
#   scripts/verify-migrations-postgres.sh                            # changed vs origin/main
#   scripts/verify-migrations-postgres.sh --base=main
#   scripts/verify-migrations-postgres.sh backend/database/migrations/2026_09_09_194000_*.php
#   scripts/verify-migrations-postgres.sh --all                      # whole set, from scratch
#   scripts/verify-migrations-postgres.sh --static-only              # fast scan, no container
#   scripts/verify-migrations-postgres.sh --allow-down-data-loss     # accept a lossy down()
#   scripts/verify-migrations-postgres.sh --require-targets          # an empty selection is an error
#   scripts/verify-migrations-postgres.sh --no-lock-probe            # skip contention probe
#   scripts/verify-migrations-postgres.sh --seed-sql=rows.sql        # realistic rows before up()
#   scripts/verify-migrations-postgres.sh --out-dir=/tmp/evidence --keep
#
set -euo pipefail

# Byte order, not locale order: migration names are compared lexicographically to
# decide what precedes a target, and a locale-dependent collation would make that
# machine-dependent.
export LC_ALL=C

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
MIGRATIONS_DIR="$BACKEND_DIR/database/migrations"

PG_IMAGE="pgvector/pgvector:pg18"
SEED_ROWS=25
MODE="changed"
BASE_REF="origin/main"
OUT_DIR=""
KEEP=0
PROD_COUNTS=1
ALLOW_DOWN_DATA_LOSS=0
STRICT=0
STATIC_ONLY=0
LOCK_PROBE=1
SEED_SQL=""
PROD_CONTAINER="${MERCASTO_PROD_DB_CONTAINER:-mercasto_db_container}"
PROD_DB="${MERCASTO_PROD_DB:-mercasto}"
PROD_USER="${MERCASTO_PROD_DB_USER:-mercasto_user}"
APP_KEY_VALUE="base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

TARGETS=()
FAILURES=()
WARNINGS=()
EXTRA_ENV=()

# --------------------------------------------------------------------------- util

say()   { printf '%s\n' "$*"; }
head1() {
  local now; now="$(date +%s)"
  if [ "${START_TIME:-0}" -gt 0 ]; then
    printf '\n=== %s === (t+%ss)\n' "$*" "$((now - START_TIME))"
  else
    printf '\n=== %s ===\n' "$*"
  fi
}
ok()    { printf '  PASS  %s\n' "$*"; }
bad()   { printf '  FAIL  %s\n' "$*"; FAILURES+=("$*"); }
warn()  { printf '  WARN  %s\n' "$*"; WARNINGS+=("$*"); }
info()  { printf '  ..    %s\n' "$*"; }
die()   { printf 'ERROR: %s\n' "$*" >&2; exit 2; }

usage() { sed -n '3,46p' "${BASH_SOURCE[0]}" | sed -E 's/^#( |$)//'; exit 0; }

for arg in "$@"; do
  case "$arg" in -h|--help) usage ;; esac
done

# Initialised BEFORE parsing: assigning defaults after the loop silently erased
# --require-targets, so an explicit request to fail on an empty selection returned 0.
REQUIRE_TARGETS=0

while [ $# -gt 0 ]; do
  case "$1" in
    --base=*)               BASE_REF="${1#*=}"; shift ;;
    --base)                 BASE_REF="$2"; shift 2 ;;
    --all)                  MODE="all"; shift ;;
    --static-only)          STATIC_ONLY=1; shift ;;
    --seed-rows=*)          SEED_ROWS="${1#*=}"; shift ;;
    --seed-rows)            SEED_ROWS="$2"; shift 2 ;;
    --pg-image=*)           PG_IMAGE="${1#*=}"; shift ;;
    --out-dir=*)            OUT_DIR="${1#*=}"; shift ;;
    --keep)                 KEEP=1; shift ;;
    --no-production-counts) PROD_COUNTS=0; shift ;;
    --no-lock-probe)        LOCK_PROBE=0; shift ;;
    --seed-sql=*)           SEED_SQL="${1#*=}"; shift ;;
    --seed-sql)             SEED_SQL="$2"; shift 2 ;;
    --allow-down-data-loss) ALLOW_DOWN_DATA_LOSS=1; shift ;;
    --strict)               STRICT=1; shift ;;
    --require-targets)      REQUIRE_TARGETS=1; shift ;;
    --production-container=*) PROD_CONTAINER="${1#*=}"; shift ;;
    --)                     shift; while [ $# -gt 0 ]; do TARGETS+=("$1"); shift; done ;;
    -*)                     die "unknown option: $1 (try --help)" ;;
    *)                      TARGETS+=("$1"); shift ;;
  esac
done
[ "${#TARGETS[@]}" -gt 0 ] && MODE="files"

# -------------------------------------------------------------- target selection

select_targets() {
  local f base
  case "$MODE" in
    all)
      while IFS= read -r f; do TARGETS+=("$f"); done \
        < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.php' | sort)
      ;;
    changed)
      base="$(git -C "$ROOT_DIR" merge-base "$BASE_REF" HEAD 2>/dev/null || true)"
      [ -n "$base" ] || die "cannot resolve --base=$BASE_REF; pass explicit files or use --all"
      while IFS= read -r f; do
        if [ -n "$f" ]; then TARGETS+=("$ROOT_DIR/$f"); fi
      # A renamed migration is classified R, which an AM filter drops: the workflow
      # still fires because a migration path changed, but the verifier would select
      # nothing and exit 0. Renaming a migration also changes its recorded name, so
      # Laravel can execute it again -- exactly the case that must not be skipped.
      # --no-renames turns a rename into D+A so the destination is selected as an add;
      # R stays in the filter in case rename detection survives.
      done < <(git -C "$ROOT_DIR" diff --name-only --no-renames --diff-filter=AMR "$base" HEAD -- \
                 backend/database/migrations 2>/dev/null | grep '\.php$' | sort || true)
      ;;
    files) : ;;
  esac
}

# ------------------------------------------------------------- static scanning

# Pattern scan. Cheap and container-free. It catches classes of problem that are
# visible in the source; it cannot catch a semantic surprise such as a foreign key
# recreated with different delete semantics, which is what the dynamic half is for.
run_static_scan() {
  local file rel
  head1 "Static scan"
  for file in "$@"; do
    rel="${file#"$ROOT_DIR"/}"
    say "  $rel"
    if grep -qE 'dropColumn|->drop\(|Schema::drop|DB::statement\([^)]*DROP ' "$file"; then
      warn "$rel drops schema objects (dropColumn/DROP); confirm down() intent"
    fi
    if grep -qE 'DB::table\([^)]*\)->delete\(\)|->truncate\(\)|DB::statement\([^)]*DELETE ' "$file"; then
      warn "$rel deletes rows; a rollback that deletes records is not reversible"
    fi
    if ! grep -qE 'hasTable|hasColumn|hasIndex' "$file"; then
      warn "$rel has no Schema::hasTable()/hasColumn() guard; a re-apply may throw"
    fi
    if grep -qE '\->change\(\)' "$file"; then
      warn "$rel calls ->change(); PostgreSQL may rewrite the table under ACCESS EXCLUSIVE"
    fi
    if grep -qE 'dropForeign|dropConstrainedForeignId' "$file"; then
      warn "$rel drops a foreign key; PostgreSQL takes ACCESS EXCLUSIVE on the table and SHARE ROW EXCLUSIVE on the referenced table"
    fi
    if grep -qE '\$withinTransaction[[:space:]]*=[[:space:]]*false' "$file"; then
      warn "$rel opts out of the migration transaction (\$withinTransaction = false)"
    fi
    if grep -qE 'DB::table\([^)]*\)->update\(|DB::table\([^)]*\)->delete\(\)' "$file" \
       && ! grep -qE 'whereNotNull|whereNull|where\(|chunkById|orderBy' "$file"; then
      warn "$rel writes a whole table with no WHERE clause and no chunking"
    fi
    if grep -qE 'chunkById|cursor\(|->chunk\(' "$file"; then
      info "$rel chunks its backfill"
    fi
  done
}

# Classes reachable from the migration through App\Support, following both `use`
# imports and bare same-namespace static calls, because that is where this
# repository hides its backfill logic.
support_class_closure() {
  local file="$1" seen="" queue="" dep depfile
  queue="$(grep -oE 'use App\\Support\\[A-Za-z0-9_]+;' "$file" 2>/dev/null \
            | sed -E 's/use App\\Support\\([A-Za-z0-9_]+);/\1/' || true)"
  local depth=0
  while [ "$depth" -lt 4 ]; do
    depth=$((depth + 1))
    local next=""
    for dep in $queue; do
      case " $seen " in *" $dep "*) continue ;; esac
      seen="$seen $dep"
      depfile="$BACKEND_DIR/app/Support/$dep.php"
      [ -f "$depfile" ] || continue
      echo "$depfile"
      next="$next $(grep -oE '\b[A-Z][A-Za-z0-9_]*::' "$depfile" | tr -d ':' | sort -u | tr '\n' ' ' || true)"
    done
    queue="$next"
    [ -n "$(echo "$queue" | tr -d ' ')" ] || break
  done
}

# Configuration the migration depends on. Reports presence only; values are never
# printed because a config key can hold a credential.
run_config_scan() {
  local file rel scanfiles envkeys cfgkeys key dotted resolved flag
  head1 "Configuration dependencies"
  for file in "$@"; do
    rel="${file#"$ROOT_DIR"/}"
    scanfiles="$file $(support_class_closure "$file" | tr '\n' ' ')"

    envkeys="$(grep -hoE "env\('[A-Z0-9_]+'" $scanfiles 2>/dev/null | sed -E "s/env\('//" | sort -u || true)"
    cfgkeys="$(grep -hoE "config\('[a-z0-9_.]+'" $scanfiles 2>/dev/null | sed -E "s/config\('//; s/'$//" | sort -u || true)"

    if [ -z "$envkeys" ] && [ -z "$cfgkeys" ]; then
      info "$rel reads no env()/config() value directly or through App\\Support"
    fi

    for key in $envkeys; do
      if printenv "$key" >/dev/null 2>&1; then
        info "$rel env($key) — SET in this environment"
      else
        warn "$rel depends on env($key) — NOT set here; a backfill reading it will persist its default"
      fi
    done

    if [ -f "$BACKEND_DIR/artisan" ] && [ -d "$BACKEND_DIR/vendor" ]; then
      for dotted in $cfgkeys; do
        resolved="$(cd "$BACKEND_DIR" && APP_ENV=local APP_KEY="$APP_KEY_VALUE" \
          php artisan config:show "$dotted" --json 2>/dev/null < /dev/null || true)"
        if [ -z "$resolved" ]; then
          info "$rel config($dotted) — key not present in config"
          continue
        fi
        flag="$(printf '%s' "$resolved" | php -r '
          $d = json_decode(stream_get_contents(STDIN), true);
          if (!is_array($d)) { $v = $d; } else { $v = reset($d); }
          echo (($v === null || $v === "" || $v === 0 || $v === 0.0 || $v === false) ? "EMPTY" : "SET");' 2>/dev/null || echo UNKNOWN)"
        if [ "$flag" = "EMPTY" ]; then
          warn "$rel depends on config($dotted) — resolves EMPTY here; a backfill reading it will persist an empty default"
        else
          info "$rel config($dotted) — $flag (value deliberately not printed)"
        fi
      done
    fi
  done
}

# ------------------------------------------------------------------ environment

require_tools() {
  command -v docker >/dev/null 2>&1 || die "docker is required"
  docker info >/dev/null 2>&1 || die "cannot talk to the docker daemon"
  [ -f "$BACKEND_DIR/artisan" ] || die "backend/artisan not found under $ROOT_DIR"
  [ -d "$BACKEND_DIR/vendor" ] || die "backend/vendor missing; run 'composer install' in backend/ first"
  php -m | grep -qx 'pdo_pgsql' || die "the host php has no pdo_pgsql extension; migrations cannot run against PostgreSQL"
}

CONTAINER="" PG_PORT="" PG_USER="mc_verify" PG_PASS="" ASSET_DIR="" START_TIME=0 PROBE_BLOCKED=0

start_container() {
  PG_PASS="mc$(head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9')"
  local attempt i
  for attempt in 1 2; do
    CONTAINER="mercasto-migverify-$$-$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    if ! docker run -d --rm --name "$CONTAINER" \
        -e POSTGRES_USER="$PG_USER" -e POSTGRES_PASSWORD="$PG_PASS" -e POSTGRES_DB=postgres \
        -p 127.0.0.1::5432 "$PG_IMAGE" \
        -c fsync=off -c full_page_writes=off -c synchronous_commit=off \
        -c log_statement=all -c log_line_prefix='%m [%p] ' >/dev/null; then
      info "docker run failed on attempt $attempt"
      continue
    fi

    for i in $(seq 1 120); do
      docker exec "$CONTAINER" pg_isready -U "$PG_USER" -d postgres >/dev/null 2>&1 && break
      sleep 0.5
    done
    if docker exec "$CONTAINER" pg_isready -U "$PG_USER" -d postgres >/dev/null 2>&1; then
      break
    fi

    # Fail with evidence rather than a bare timeout: a container that exited during
    # start leaves its reason in the logs, and a container that is still starting
    # leaves its state in docker inspect.
    info "attempt $attempt: $CONTAINER was not ready after 60s"
    docker inspect -f '        state={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} error={{.State.Error}}' "$CONTAINER" 2>&1 | sed 's/^/  /' || true
    docker logs --tail 15 "$CONTAINER" 2>&1 | sed 's/^/        /' || true
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  done
  docker exec "$CONTAINER" pg_isready -U "$PG_USER" -d postgres >/dev/null 2>&1 \
    || die "throwaway PostgreSQL did not become ready after 2 attempts"

  PG_PORT="$(docker port "$CONTAINER" 5432/tcp | head -1 | sed -E 's/.*:([0-9]+)$/\1/')"
  [ -n "$PG_PORT" ] || die "could not determine the published port of $CONTAINER"
}

cleanup() {
  local rc=$?
  if [ -n "$CONTAINER" ]; then
    if [ "$KEEP" = "1" ]; then
      say ""
      say "Container kept for inspection: $CONTAINER"
      say "  docker exec -it $CONTAINER psql -U $PG_USER -d postgres"
    else
      docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    fi
  fi
  [ -n "$ASSET_DIR" ] && rm -rf "$ASSET_DIR" 2>/dev/null || true
  return $rc
}

# Everything runs inside the throwaway container: no host psql is required, and no
# host DSN can leak into the verification.
psql_db()      { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U "$PG_USER" -d "$1" -tAc "$2" < /dev/null; }
psql_db_file() { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U "$PG_USER" -d "$1" -f - < "$2"; }
psql_admin()   { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U "$PG_USER" -d postgres -tAc "$1" < /dev/null; }

artisan() {
  local db="$1"; shift
  ( cd "$BACKEND_DIR" && env \
      DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT="$PG_PORT" DB_DATABASE="$db" \
      DB_USERNAME="$PG_USER" DB_PASSWORD="$PG_PASS" DB_URL="" \
      APP_ENV=local APP_DEBUG=false APP_KEY="$APP_KEY_VALUE" \
      CACHE_STORE=array SESSION_DRIVER=array QUEUE_CONNECTION=sync \
      ${EXTRA_ENV[@]+"${EXTRA_ENV[@]}"} \
      php artisan "$@" --no-interaction 2>&1 < /dev/null )
}

# Fail closed if the target is not demonstrably the throwaway container.
#
# The in-container psql reaches PostgreSQL over a unix socket, so inet_server_addr()
# is NULL there and would prove nothing. The meaningful assertion is on the *host*
# side, because that is the path artisan takes: the connection must land on this
# container's own bridge address and on a database this tool created. Anything else
# — a production DSN inherited from the environment, a hardcoded host — aborts the run.
assert_target_is_throwaway() {
  local db="$1" out addr rest port gotdb container_ip
  [ "$(psql_db "$db" "select current_database()")" = "$db" ] \
    || die "refusing to continue: in-container psql is not on database $db"

  out="$( cd "$BACKEND_DIR" && env DB_HOST=127.0.0.1 DB_PORT="$PG_PORT" \
            DB_DATABASE="$db" DB_USERNAME="$PG_USER" DB_PASSWORD="$PG_PASS" \
            php "$ASSET_DIR/probe.php" 2>&1 )" \
    || die "host-side PostgreSQL probe failed: $out"
  addr="${out%%|*}"; rest="${out#*|}"; port="${rest%%|*}"; gotdb="${rest#*|}"

  container_ip="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$CONTAINER" 2>/dev/null | awk '{print $1}')"
  [ -n "$container_ip" ] || die "cannot determine the throwaway container address"
  [ "$addr" = "$container_ip" ] && [ "$port" = "5432" ] && [ "$gotdb" = "$db" ] \
    || die "refusing to continue: the host DSN resolved to $addr:$port/$gotdb, but the throwaway container is $container_ip:5432/$db"
  ok "DSN guard: the host connection terminates inside the throwaway container ($addr:5432, database $gotdb)"
}

# ------------------------------------------------------------------- SQL assets

write_sql_assets() {
  ASSET_DIR="$(mktemp -d)"
  cat > "$ASSET_DIR/probe.php" <<'PHP'
<?php
$dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s', getenv('DB_HOST'), getenv('DB_PORT'), getenv('DB_DATABASE'));
$pdo = new PDO($dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$row = $pdo->query("select coalesce(host(inet_server_addr()),'local'), inet_server_port()::text, current_database()")->fetch(PDO::FETCH_NUM);
echo implode('|', $row), PHP_EOL;
PHP

  cat > "$ASSET_DIR/fingerprint.sql" <<'SQL'
\pset format unaligned
\pset fieldsep '|'
\pset tuples_only on
SELECT 'TBL', tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT 'COL', table_name, column_name, data_type, udt_name, is_nullable,
       coalesce(column_default,'~'), coalesce(character_maximum_length::text,'~'),
       coalesce(numeric_precision::text,'~'), coalesce(numeric_scale::text,'~')
  FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, column_name;
SELECT 'IDX', tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;
SELECT 'CON', c.relname, con.conname, con.contype, pg_get_constraintdef(con.oid)
  FROM pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname='public' ORDER BY c.relname, con.conname;
SELECT 'ENU', t.typname, e.enumlabel, e.enumsortorder::text
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid ORDER BY t.typname, e.enumsortorder;
SELECT 'SEQ', sequence_name FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY sequence_name;
-- Extensions, functions and triggers are schema objects a migration can create and a
-- down() can fail to remove. Without them here, a rollback that leaves a function or
-- trigger behind compared equal to the baseline and was reported as an exact restore.
-- Objects owned by an extension are excluded: the extension row already describes them.
SELECT 'EXT', e.extname, e.extversion, n.nspname
  FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
 WHERE e.extname <> 'plpgsql' ORDER BY e.extname;
SELECT 'FUN', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid), p.prokind,
       md5(coalesce(p.prosrc, ''))
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
 ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid);
SELECT 'TRG', c.relname, t.tgname, pg_get_triggerdef(t.oid)
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND NOT t.tgisinternal
   AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = t.oid AND d.deptype = 'e')
 ORDER BY c.relname, t.tgname;
SQL

  # Deterministic synthetic rows, so data-dependent behaviour (backfills, deletes,
  # foreign-key actions) has something to act on. Every third row leaves its nullable
  # columns NULL on purpose: NULL is both the state a migration creates and the state
  # a lossy down() destroys.
  # Reports, per column, how many rows are NULL and a few values actually present.
  # Diffing this before and after up() shows what a backfill really persisted --
  # including a column filled with a default such as 0.00.
  cat > "$ASSET_DIR/column-state.sql" <<'SQL'
CREATE OR REPLACE FUNCTION mc_column_state(p_table text) RETURNS TABLE(col text, nulls bigint, total bigint, ndistinct bigint, sample text) AS $$
DECLARE c record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=p_table) THEN
    RETURN;
  END IF;
  FOR c IN SELECT column_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name=p_table
            ORDER BY ordinal_position
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT count(*) FILTER (WHERE %1$I IS NULL), count(*),'
        ' (SELECT count(DISTINCT left(%1$I::text, 40)) FROM public.%2$I WHERE %1$I IS NOT NULL),'
        ' (SELECT string_agg(v, '', '') FROM (SELECT DISTINCT left(%1$I::text, 40) AS v'
        '   FROM public.%2$I WHERE %1$I IS NOT NULL LIMIT 3) t)'
        ' FROM public.%2$I', c.column_name, p_table)
      INTO nulls, total, ndistinct, sample;
      col := c.column_name;
      RETURN NEXT;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$ LANGUAGE plpgsql;
SQL

  cat > "$ASSET_DIR/seed.sql" <<'SQL'
CREATE OR REPLACE FUNCTION mc_seed(p_table text, p_rows int) RETURNS int AS $$
DECLARE
  cols text[] := '{}';
  c record;
  i int;
  lit text;
  rowvals text[];
  vals text[] := '{}';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=p_table) THEN
    RETURN 0;
  END IF;
  FOR c IN SELECT column_name FROM information_schema.columns
            WHERE table_schema='public' AND table_name=p_table
              AND is_identity='NO' AND is_generated='NEVER'
            ORDER BY ordinal_position
  LOOP
    cols := cols || c.column_name::text;
  END LOOP;
  IF array_length(cols,1) IS NULL THEN RETURN 0; END IF;

  FOR i IN 1..p_rows LOOP
    rowvals := '{}';
    FOR c IN SELECT column_name, data_type, udt_name, is_nullable,
                     character_maximum_length, numeric_precision, numeric_scale
               FROM information_schema.columns
              WHERE table_schema='public' AND table_name=p_table
                AND is_identity='NO' AND is_generated='NEVER'
              ORDER BY ordinal_position
    LOOP
      IF c.is_nullable = 'YES' AND (i % 3 = 0) THEN
        rowvals := rowvals || 'NULL'::text;
        CONTINUE;
      END IF;
      lit := CASE
        WHEN c.data_type IN ('smallint','integer','bigint') THEN (i + 1000)::text
        WHEN c.data_type = 'numeric' THEN
          ((i % 9 + 1) * power(10::numeric, -greatest(coalesce(c.numeric_scale, 2), 0)))::text
        WHEN c.data_type IN ('real','double precision') THEN (i * 1.25)::text
        WHEN c.data_type = 'boolean' THEN CASE WHEN i % 2 = 0 THEN 'true' ELSE 'false' END
        WHEN c.data_type LIKE 'timestamp%' THEN quote_literal(timestamptz '2026-01-01 00:00:00+00' + (i || ' hours')::interval)
        WHEN c.data_type = 'date' THEN quote_literal(date '2026-01-01' + i)
        WHEN c.data_type = 'time without time zone' THEN quote_literal('12:00:00')
        WHEN c.data_type = 'uuid' THEN quote_literal(md5(p_table || i)::uuid)
        WHEN c.data_type IN ('json','jsonb') THEN quote_literal('{}')
        WHEN c.data_type = 'ARRAY' THEN quote_literal('{}')
        WHEN c.data_type = 'bytea' THEN quote_literal('\x00')
        -- Enum-like CHECK constraints (role, kyc_status, ...) admit only a fixed set
        -- of literals, so a random string fails the whole insert. Take the first
        -- literal the constraint allows; fall back to a hex digest respecting the
        -- declared width, which a varchar(6) accepts where 'seed-10' does not.
        WHEN c.data_type LIKE 'character%' OR c.data_type = 'text' THEN coalesce(
          (SELECT quote_literal(m[1])
             FROM pg_constraint con
             CROSS JOIN LATERAL regexp_matches(pg_get_constraintdef(con.oid), '''([^'']*)''', 'g') AS m
            WHERE con.conrelid = format('public.%I', p_table)::regclass
              AND con.contype = 'c'
              AND pg_get_constraintdef(con.oid) ~ ('\m' || c.column_name || '\M')
            LIMIT 1),
          quote_literal(left(md5(p_table || i), coalesce(c.character_maximum_length, 32))))
        WHEN c.data_type = 'USER-DEFINED' THEN (
          SELECT quote_literal(e.enumlabel) FROM pg_type t
            JOIN pg_enum e ON e.enumtypid = t.oid
           WHERE t.typname = c.udt_name ORDER BY e.enumsortorder LIMIT 1)
        ELSE quote_literal('seed-' || i)
      END;
      IF lit IS NULL THEN lit := 'NULL'; END IF;
      rowvals := rowvals || lit::text;
    END LOOP;
    vals := vals || ('(' || array_to_string(rowvals, ', ') || ')')::text;
  END LOOP;

  EXECUTE format('INSERT INTO public.%I (%s) VALUES %s', p_table,
                 (SELECT string_agg(quote_ident(x), ', ') FROM unnest(cols) x),
                 array_to_string(vals, ', '));
  RETURN p_rows;
EXCEPTION WHEN others THEN
  RAISE WARNING 'mc_seed skipped %: %', p_table, SQLERRM;
  RETURN 0;
END $$ LANGUAGE plpgsql;
SQL
}

fingerprint_db() {
  docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U "$PG_USER" -d "$1" -f - < "$ASSET_DIR/fingerprint.sql"
}

row_snapshot() {
  psql_db "$1" "SELECT count(*)::text || '|' || coalesce(md5(string_agg(t::text, E'\n' ORDER BY t::text)),'empty') FROM public.\"$2\" t"
}

row_columns() { # db table -> comma-separated column names, in table order
  psql_db "$1" "SELECT coalesce(string_agg(column_name, ',' ORDER BY ordinal_position),'') FROM information_schema.columns WHERE table_schema='public' AND table_name='$2'"
}

# Row identity over a subset of columns. Dropping a column changes what `t::text`
# renders, so comparing the whole-row hash across a rollback that drops a column
# reports every row as replaced when nothing happened to the rows at all. Comparing
# over the columns present both before and after keeps that signal honest while still
# catching a delete-and-reinsert, which changes the values that remain.
row_snapshot_over() { # db table "col1,col2"
  local db="$1" tbl="$2" cols="$3" expr="" c old_ifs="$IFS"
  IFS=','
  for c in $cols; do
    expr="${expr:+$expr || '|' || }coalesce(\"$c\"::text, '~')"
  done
  IFS="$old_ifs"
  if [ -z "$expr" ]; then
    psql_db "$db" "SELECT count(*)::text || '|no-common-columns' FROM public.\"$tbl\""
    return
  fi
  psql_db "$db" "SELECT count(*)::text || '|' || coalesce(md5(string_agg(x, E'\n' ORDER BY x)),'empty') FROM (SELECT $expr AS x FROM public.\"$tbl\") s"
}

# Intersection of two comma-separated lists, in the order of the first.
list_intersect() {
  local a="$1" b="$2" out="" x old_ifs="$IFS"
  IFS=','
  for x in $a; do
    case ",$b," in *",$x,"*) out="${out:+$out,}$x" ;; esac
  done
  IFS="$old_ifs"
  printf '%s' "$out"
}
table_exists() { [ "$(psql_db "$1" "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='$2'")" = "1" ]; }

# The table name is always the final capture group of the patterns below; indexing
# it from the end keeps the extractors correct when a pattern gains a group.
last_group() { printf '%s' "${BASH_REMATCH[${#BASH_REMATCH[@]}-1]}"; }

static_candidate_tables() {
  local file
  for file in "$@"; do
    grep -oE "Schema::(table|create|hasTable|hasColumn|drop|dropIfExists)\(\s*'[a-z0-9_]+'" "$file" \
      | grep -oE "'[a-z0-9_]+'" | tr -d "'"
    grep -oE "DB::table\(\s*'[a-z0-9_]+'" "$file" | grep -oE "'[a-z0-9_]+'" | tr -d "'"
    # Raw SQL names tables the schema builder never sees. A down() written as
    # DB::statement('DELETE FROM audit_logs') names a table nowhere else, so without
    # this the table was outside the pre-down snapshot and its rows could be deleted
    # with the run still reporting that down() destroyed nothing.
    #
    # `update` requires a following identifier, so `->update(['x' => 1])` and
    # `->update($data)` do not match. Over-inclusion is harmless: an extra table is
    # snapshotted, at worst.
    grep -oiE "(delete[[:space:]]+from|truncate([[:space:]]+table)?|drop[[:space:]]+table([[:space:]]+if[[:space:]]+exists)?|insert[[:space:]]+into|alter[[:space:]]+table|update)[[:space:]]+[\"']?[a-z0-9_]+" "$file" \
      | grep -oiE '[a-z0-9_]+$'
  done | sort -u
}

# Table names actually named by the DDL/DML that executed.
emitted_tables() {
  local stmt tbl
  while IFS= read -r stmt; do
    tbl=""
    [[ "$stmt" =~ ^[[:space:]]*(alter[[:space:]]+table([[:space:]]+if[[:space:]]+exists)?([[:space:]]+only)?|create[[:space:]]+table([[:space:]]+if[[:space:]]+not[[:space:]]+exists)?|drop[[:space:]]+table([[:space:]]+if[[:space:]]+exists)?|insert[[:space:]]+into|update|delete[[:space:]]+from|truncate([[:space:]]+table)?|comment[[:space:]]+on[[:space:]]+table)[[:space:]]+([a-zA-Z0-9_]+\.)?\"?([a-zA-Z0-9_]+)\"? ]] \
      && tbl="$(last_group)"
    if [ -z "$tbl" ] && [[ "$stmt" =~ ^[[:space:]]*create([[:space:]]+unique)?[[:space:]]+index([[:space:]]+concurrently)?([[:space:]]+if[[:space:]]+not[[:space:]]+exists)?[[:space:]]+[^[:space:]]+[[:space:]]+on[[:space:]]+([a-zA-Z0-9_]+\.)?\"?([a-zA-Z0-9_]+)\"? ]]; then
      tbl="$(last_group)"
    fi
    [ -n "$tbl" ] && printf '%s\n' "$tbl"
  done | sort -u
}

log_lines()    { docker logs "$CONTAINER" 2>&1 | wc -l; }
log_since()    { docker logs "$CONTAINER" 2>&1 | tail -n +"$(( $1 + 1 ))"; }
# PDO sends the DDL through the extended protocol, so the server logs it as
# `LOG:  execute pdo_stmt_00000009: alter table ...` rather than `LOG:  statement:`.
# Both forms are captured; `LOG:  STATEMENT:` (upper case, the error context) is not.
#
# A hand-written multi-line DB::statement is logged verbatim, so it arrives as several
# log lines. Continuation lines are joined back onto the statement they belong to --
# this repository's pgvector migrations are written that way, and a line-based reader
# silently sees only the first fragment.
captured_sql() {
  log_since "$1" | awk '
    /LOG:  (statement|execute [^:]*): / {
      if (buf != "") print buf
      sub(/.*LOG:  (statement|execute [^:]*): /, "")
      buf = $0
      next
    }
    /^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] / { next }
    { if (buf != "") buf = buf " " $0 }
    END { if (buf != "") print buf }
  ' || true
}

# --------------------------------------------------------------- locks & impact

# Lock levels PostgreSQL acquires for each statement class. This mapping is what the
# contention probe below then confirms or refutes by measurement.
lock_class() {
  local stmt="$1"
  shopt -s nocasematch
  if [[ "$stmt" =~ ^alter[[:space:]]+table.*add[[:space:]]+constraint.*foreign[[:space:]]+key ]]; then
    echo "ACCESS EXCLUSIVE on the table + SHARE ROW EXCLUSIVE on the referenced table"
  elif [[ "$stmt" =~ ^alter[[:space:]]+table ]]; then echo "ACCESS EXCLUSIVE (blocks reads and writes)"
  elif [[ "$stmt" =~ ^create[[:space:]]+index[[:space:]]+concurrently ]]; then echo "SHARE UPDATE EXCLUSIVE (does not block writes)"
  elif [[ "$stmt" =~ ^create[[:space:]]+index ]]; then echo "SHARE (blocks writes, allows reads)"
  elif [[ "$stmt" =~ ^drop[[:space:]]+index[[:space:]]+concurrently ]]; then echo "SHARE UPDATE EXCLUSIVE (does not block writes)"
  elif [[ "$stmt" =~ ^drop[[:space:]]+index ]]; then echo "ACCESS EXCLUSIVE (blocks reads and writes)"
  elif [[ "$stmt" =~ ^(drop[[:space:]]+table|truncate) ]]; then echo "ACCESS EXCLUSIVE (blocks reads and writes)"
  elif [[ "$stmt" =~ ^(update|delete) ]]; then echo "ROW EXCLUSIVE + row locks (blocks writes to the affected rows)"
  elif [[ "$stmt" =~ ^create[[:space:]]+table ]]; then echo "none on existing objects (new relation)"
  elif [[ "$stmt" =~ ^(create[[:space:]]+type|alter[[:space:]]+type|create[[:space:]]+sequence|alter[[:space:]]+sequence) ]]; then echo "none on tables"
  else echo ""
  fi
  shopt -u nocasematch
}

statement_table() {
  local stmt="$1"
  shopt -s nocasematch
  if [[ "$stmt" =~ ^(alter[[:space:]]+table([[:space:]]+if[[:space:]]+exists)?([[:space:]]+only)?|create[[:space:]]+table([[:space:]]+if[[:space:]]+not[[:space:]]+exists)?|drop[[:space:]]+table([[:space:]]+if[[:space:]]+exists)?|insert[[:space:]]+into|update|delete[[:space:]]+from|truncate([[:space:]]+table)?)[[:space:]]+([a-zA-Z0-9_]+\.)?\"?([a-zA-Z0-9_]+)\"? ]]; then
    last_group
  elif [[ "$stmt" =~ ^create([[:space:]]+unique)?[[:space:]]+index([[:space:]]+concurrently)?([[:space:]]+if[[:space:]]+not[[:space:]]+exists)?[[:space:]]+[^[:space:]]+[[:space:]]+on[[:space:]]+([a-zA-Z0-9_]+\.)?\"?([a-zA-Z0-9_]+)\"? ]]; then
    last_group
  fi
  shopt -u nocasematch
}

production_row_count() {
  local table="$1" est
  [ "$PROD_COUNTS" = "1" ] || { echo "n/a"; return; }
  docker inspect "$PROD_CONTAINER" >/dev/null 2>&1 || { echo "n/a"; return; }
  est="$(docker exec -i "$PROD_CONTAINER" psql -U "$PROD_USER" -d "$PROD_DB" -tAc \
      "SELECT coalesce(reltuples::bigint,-1) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='$table' AND c.relkind='r'" 2>/dev/null < /dev/null || true)"
  case "$est" in
    ''|-1) echo "n/a" ;;
    *) if [ "$est" -lt 50000 ] 2>/dev/null; then
         docker exec -i "$PROD_CONTAINER" psql -U "$PROD_USER" -d "$PROD_DB" -tAc \
           "SELECT count(*) FROM public.\"$table\"" 2>/dev/null < /dev/null || echo "~$est"
       else echo "~$est"; fi ;;
  esac
}

lock_mode_name() {
  case "$1" in
    "ACCESS SHARE")   echo "AccessShareLock" ;;
    "ROW EXCLUSIVE")  echo "RowExclusiveLock" ;;
    *)                echo "$1" ;;
  esac
}

# Measured lock requirements, by contention rather than inference.
#
#   Probe A holds ACCESS SHARE on every table in the schema. ACCESS SHARE conflicts
#   with ACCESS EXCLUSIVE and nothing else, so a statement that blocks proves it
#   needs ACCESS EXCLUSIVE — the lock that stops SELECTs and stalls a live marketplace.
#   Probe B holds ROW EXCLUSIVE, which additionally conflicts with SHARE, SHARE ROW
#   EXCLUSIVE and EXCLUSIVE, so a statement that blocks under B but not under A needs
#   a lock that blocks writers but not readers (a plain CREATE INDEX, typically).
#
# While the migration is blocked, pg_locks is sampled to name the exact relation and
# mode it is waiting for — which is how an unexpected second table shows up.
probe_contention() {
  local probe_db="$1" lockmode="$2" sample="$3" label="$4" only_table="${5:-}"
  psql_admin "DROP DATABASE IF EXISTS $probe_db" >/dev/null 2>&1 || true
  if ! psql_admin "CREATE DATABASE $probe_db TEMPLATE mc_preup" >/dev/null 2>&1; then
    info "$label: could not clone the pre-up schema; probe skipped"
    return 0
  fi

  local tables expected
  if [ -n "$only_table" ]; then
    if ! table_exists "$probe_db" "$only_table"; then
      info "$label: $only_table does not exist before this migration; probe skipped"
      return 0
    fi
    tables="public.\"$only_table\""
  else
    tables="$(psql_db "$probe_db" "SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') FROM pg_tables WHERE schemaname='public'")"
  fi
  if [ -z "$tables" ]; then info "$label: no tables to lock"; return 0; fi

  docker exec -i "$CONTAINER" psql -q -v ON_ERROR_STOP=1 -U "$PG_USER" -d "$probe_db" >/dev/null 2>&1 <<SQL &
BEGIN;
LOCK TABLE $tables IN $lockmode MODE;
SELECT pg_sleep(25);
SQL
  local holder=$!

  # Wait until the holder really owns the locks, so the probe cannot pass vacuously.
  local got tries=0 pgmode
  pgmode="$(lock_mode_name "$lockmode")"
  if [ -n "$only_table" ]; then
    expected=1
  else
    expected="$(psql_db "$probe_db" "SELECT count(*) FROM pg_tables WHERE schemaname='public'")"
  fi
  while [ "$tries" -lt 60 ]; do
    got="$(psql_db "$probe_db" "SELECT count(DISTINCT relation) FROM pg_locks WHERE mode='$pgmode' AND granted AND database=(SELECT oid FROM pg_database WHERE datname='$probe_db')" 2>/dev/null || echo 0)"
    [ "${got:-0}" -ge "$expected" ] 2>/dev/null && break
    tries=$((tries + 1)); sleep 0.1
  done
  if [ "${got:-0}" -lt "$expected" ] 2>/dev/null; then
    info "$label: lock holder did not acquire all locks; probe skipped"
    kill "$holder" 2>/dev/null || true
    return 0
  fi

  # The sampler must connect to the probe database itself: pg_class is not a shared
  # catalog, so a relation OID from another database renders as a bare number instead
  # of a table name.
  : > "$sample"
  ( for _ in $(seq 1 80); do
      docker exec -i "$CONTAINER" psql -q -U "$PG_USER" -d "$probe_db" -tAc \
        "SELECT DISTINCT coalesce(c.relname, 'oid ' || l.relation) || ' needs ' || l.mode
           FROM pg_locks l
           JOIN pg_stat_activity a ON a.pid = l.pid
           LEFT JOIN pg_class c ON c.oid = l.relation
          WHERE a.application_name = 'mercasto-migverify-probe' AND NOT l.granted" 2>/dev/null >> "$sample" || true
      sleep 0.08
    done ) &
  local sampler=$!

  EXTRA_ENV=(PGOPTIONS="-c lock_timeout=2500" PGAPPNAME=mercasto-migverify-probe)
  local out rc=0
  out="$(artisan "$probe_db" migrate --force "${UP_ARGS[@]}" 2>&1)" || rc=$?
  EXTRA_ENV=()

  kill "$sampler" 2>/dev/null || true
  kill "$holder" 2>/dev/null || true
  wait "$sampler" 2>/dev/null || true
  wait "$holder" 2>/dev/null || true

  PROBE_BLOCKED=0
  if [ "$rc" = "0" ]; then
    say "    $label: no contention — no statement needed a lock that conflicts with $lockmode"
  elif printf '%s' "$out" | grep -qiE 'lock timeout|55P03|lock not available'; then
    PROBE_BLOCKED=1
    if [ "$lockmode" = "ACCESS SHARE" ]; then
      warn "BLOCKED under held $lockmode: the migration needs ACCESS EXCLUSIVE, the only lock that conflicts with ACCESS SHARE, so it stops reads as well as writes"
    else
      say "    BLOCKED under held $lockmode: the migration needs at least SHARE — it blocks writers but not readers"
    fi
    say "      sampled from pg_locks while the statement was blocked — the relation is"
    say "      evidence, the requested mode is what the server asked for at sampling time:"

    if [ -s "$sample" ]; then
      sort -u "$sample" | sed '/^$/d' | sed 's/^/        /'
    else
      say "        (relation not sampled within the timeout window; first blocked statement was:)"
      printf '%s\n' "$out" | tr -s ' \n' ' ' | grep -oE 'statement: [^,]*' | head -1 | sed 's/^/        /'
    fi
  else
    say "    $label: the migration exited non-zero for a reason other than lock contention:"
    printf '%s\n' "$out" | tail -4 | sed 's/^/        /'
  fi
}

no_targets() {
  if [ "$REQUIRE_TARGETS" = "1" ]; then
    die "no migrations selected (nothing changed vs $BASE_REF); pass explicit files, --all, or drop --require-targets"
  fi
  say "No migrations changed against $BASE_REF; nothing to verify."
  say "Use --all to verify the whole set, or pass migration files explicitly."
  exit 0
}

# =========================================================================== main

select_targets

if [ "$STATIC_ONLY" = "1" ]; then

  [ "${#TARGETS[@]}" -gt 0 ] || no_targets
  run_static_scan "${TARGETS[@]}"
  run_config_scan "${TARGETS[@]}"
  head1 "Result"
  [ "${#FAILURES[@]}" -gt 0 ] && { say "RESULT: FAIL"; exit 1; }
  say "  ${#WARNINGS[@]} advisory warning(s)"
  say "RESULT: PASS"
  exit 0
fi

require_tools
[ "${#TARGETS[@]}" -gt 0 ] || no_targets

START_TIME=$(date +%s)
trap cleanup EXIT

head1 "Mercasto migration verification (PostgreSQL)"
say "  repo      : $ROOT_DIR"
say "  head      : $(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
say "  base      : $BASE_REF"
say "  targets   : ${#TARGETS[@]} migration(s)"
for f in "${TARGETS[@]}"; do say "                ${f#"$ROOT_DIR"/}"; done

if [ -n "$OUT_DIR" ]; then mkdir -p "$OUT_DIR"; else OUT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mercasto-migverify.XXXXXX")"; fi
say "  artifacts : $OUT_DIR"

write_sql_assets

head1 "Throwaway database"
info "image: $PG_IMAGE"
start_container
info "container: $CONTAINER (published on 127.0.0.1:$PG_PORT), removed on exit"
psql_admin "CREATE DATABASE mc_base" >/dev/null
assert_target_is_throwaway mc_base
say "  ..    server: PostgreSQL $(psql_db mc_base "SHOW server_version")"

run_static_scan "${TARGETS[@]}"
run_config_scan "${TARGETS[@]}"

# ------------------------------------------------------------- 1. baseline
head1 "[1/8] Baseline schema (every migration except the targets)"
declare -A TARGET_SET=()
MIG_NAMES=()
for f in "${TARGETS[@]}"; do
  TARGET_SET["$(basename "$f" .php)"]=1
  MIG_NAMES+=("$(basename "$f" .php)")
done
MIG_IN_LIST="$(printf "'%s'," "${MIG_NAMES[@]}")"; MIG_IN_LIST="${MIG_IN_LIST%,}"

UP_ARGS=()
for f in "${TARGETS[@]}"; do UP_ARGS+=(--path="database/migrations/$(basename "$f")"); done

# The baseline is the schema the target originally ran against: every migration that
# sorts BEFORE the earliest target. Later migrations are deliberately excluded, because
# including them makes it impossible to verify a fix to a historical migration -- a
# successor that alters what the target created fails during baseline construction, so
# the target is never exercised at all.
#
# For the ordinary case, where a branch appends its migrations at the end, there are no
# successors and this is exactly "everything except the targets".
EARLIEST_TARGET=""
for f in "${TARGETS[@]}"; do
  b="$(basename "$f" .php)"
  if [ -z "$EARLIEST_TARGET" ] || [[ "$b" < "$EARLIEST_TARGET" ]]; then EARLIEST_TARGET="$b"; fi
done

BASELINE_ARGS=(); SUCCESSORS_EXCLUDED=0
while IFS= read -r mfile; do
  name="$(basename "$mfile" .php)"
  [ -n "${TARGET_SET[$name]:-}" ] && continue
  if [[ "$name" > "$EARLIEST_TARGET" ]]; then
    SUCCESSORS_EXCLUDED=$((SUCCESSORS_EXCLUDED + 1))
    continue
  fi
  BASELINE_ARGS+=(--path="database/migrations/$(basename "$mfile")")
done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.php' | sort)

if [ "${#BASELINE_ARGS[@]}" -gt 0 ]; then
  if ! artisan mc_base migrate --force "${BASELINE_ARGS[@]}" > "$OUT_DIR/baseline.log" 2>&1; then
    bad "baseline migrations failed to apply (see $OUT_DIR/baseline.log)"
    tail -20 "$OUT_DIR/baseline.log" | sed 's/^/        /'
    exit 1
  fi
fi
BASE_TABLES="$(psql_db mc_base "SELECT count(*) FROM pg_tables WHERE schemaname='public'")"
if [ "${#BASELINE_ARGS[@]}" -gt 0 ] && [ "${BASE_TABLES:-0}" -lt 1 ]; then
  # A non-empty baseline that produced no tables means artisan wrote somewhere else.
  # With --all the baseline is legitimately empty, so the check moves after up().
  die "the baseline produced no tables; artisan did not write to this container"
fi
ok "baseline applied: ${#BASELINE_ARGS[@]} migration(s), $BASE_TABLES table(s) in the throwaway container"

# Which tables the target set inherited. A table that disappears during rollback and
# was NOT here is one the target set created, so removing it is the rollback working;
# a table that WAS here and disappears is pre-existing data being removed.
declare -A BASE_TABLE_PRESENT=()
while IFS= read -r t; do
  if [ -n "$t" ]; then BASE_TABLE_PRESENT[$t]=1; fi
done < <(psql_db mc_base "SELECT tablename FROM pg_tables WHERE schemaname='public'")
if [ "$SUCCESSORS_EXCLUDED" -gt 0 ]; then
  info "$SUCCESSORS_EXCLUDED later migration(s) excluded from the baseline: a target that"
  info "modifies history runs against the schema that preceded it, not the current tip"
fi
# Recorded for the summary, so a reader can tell which schema the target was proven on.
printf 'baseline_migrations=%s\nsuccessors_excluded=%s\n' \
  "${#BASELINE_ARGS[@]}" "$SUCCESSORS_EXCLUDED" >> "$OUT_DIR/baseline-scope.txt"

# ---------------------------------------------------------------- 2. seed
head1 "[2/8] Seed deterministic rows into the tables the migration names"

psql_db_file mc_base "$ASSET_DIR/seed.sql" >/dev/null
psql_db_file mc_base "$ASSET_DIR/column-state.sql" >/dev/null

SEED_TABLES=()          # tables actually seeded, in the order they were seeded
declare -A SEEDED=()

fk_parents_of() { printf '%s\n' "$FK_PAIRS" | awk -F'|' -v c="$1" '$1 == c { print $2 }'; }
in_list() { local needle="$1"; shift; local x; for x in ${@+"$@"}; do [ "$x" = "$needle" ] && return 0; done; return 1; }

# Seeds a set of candidate tables: closes over foreign-key parents, orders parents
# first, and seeds everything that exists and has not been seeded yet.
#
# Called before up() and again after each target migration, because a table an earlier
# target creates does not exist when the baseline is built. Excluding it left a later
# target's data, idempotency and row-loss checks vacuous: the table was in scope and
# reported, but with zero rows in it, so nothing could be observed in it.
seed_candidates() {
  local t parent n
  local -a closure=() remaining=() ordered=() next=()
  local changed progressed blocked

  # Foreign keys must hold. The generator writes the same value range into every
  # integer column, so a parent seeded before its child satisfies the constraint.
  # Integrity is never bypassed with session_replication_role: a migration that
  # re-creates a foreign key re-validates every row, so orphaned seed rows would
  # produce a failure production cannot have.
  FK_PAIRS="$(psql_db mc_base "SELECT c.relname || '|' || p.relname FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_class p ON p.oid=con.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype='f' AND c.relname <> p.relname")"

  for t in ${@+"$@"}; do
    [ -n "$t" ] || continue
    [ "$t" = "migrations" ] && continue   # Laravel's bookkeeping, never seeded
    table_exists mc_base "$t" || continue
    in_list "$t" ${closure[@]+"${closure[@]}"} || closure+=("$t")
  done

  changed=1
  while [ "$changed" = "1" ]; do
    changed=0
    for t in ${closure[@]+"${closure[@]}"}; do
      while IFS= read -r parent; do
        [ -n "$parent" ] || continue
        table_exists mc_base "$parent" || continue
        if ! in_list "$parent" ${closure[@]+"${closure[@]}"}; then closure+=("$parent"); changed=1; fi
      done < <(fk_parents_of "$t")
    done
  done

  # Kahn ordering: repeatedly take any table that no remaining table references.
  remaining=(${closure[@]+"${closure[@]}"})
  while [ "${#remaining[@]}" -gt 0 ]; do
    progressed=0; next=()
    for t in "${remaining[@]}"; do
      blocked=0
      while IFS= read -r parent; do
        [ -n "$parent" ] || continue
        if in_list "$parent" ${remaining[@]+"${remaining[@]}"} && [ "$parent" != "$t" ]; then blocked=1; fi
      done < <(fk_parents_of "$t")
      if [ "$blocked" = "0" ]; then ordered+=("$t"); progressed=1; else next+=("$t"); fi
    done
    remaining=(${next[@]+"${next[@]}"})
    if [ "$progressed" = "0" ]; then ordered+=(${remaining[@]+"${remaining[@]}"}); remaining=(); fi
  done

  for t in ${ordered[@]+"${ordered[@]}"}; do
    [ -n "${SEEDED[$t]:-}" ] && continue
    SEEDED[$t]=1
    SEED_TABLES+=("$t")
    n="$(psql_db mc_base "SET client_min_messages TO warning; SELECT mc_seed('$t', $SEED_ROWS)")"
    if [ "${n:-0}" = "$SEED_ROWS" ]; then
      info "seeded $n row(s) into $t"
    else
      warn "seeded only ${n:-0} row(s) into $t (the generator could not satisfy its constraints)"
    fi
  done

  return 0
}

seed_candidates $(static_candidate_tables "${TARGETS[@]}")
if [ "${#SEED_TABLES[@]}" -gt 0 ]; then
  info "foreign keys were enforced while seeding; no referential integrity was bypassed"
else
  info "the migration names no existing table; nothing to seed"
fi

# The synthetic generator produces structurally valid rows, not business-meaningful
# ones: a backfill that only acts on `status = 'paid'` finds nothing to do. --seed-sql
# lets a reviewer supply rows that reach those states, which is what turns a silent
# no-op backfill into an observable one.
if [ -n "$SEED_SQL" ]; then
  [ -f "$SEED_SQL" ] || die "--seed-sql=$SEED_SQL does not exist"
  if psql_db_file mc_base "$SEED_SQL" > "$OUT_DIR/seed-custom.log" 2>&1; then
    ok "applied caller seed rows from $SEED_SQL"
  else
    bad "the --seed-sql file failed to apply (see $OUT_DIR/seed-custom.log)"
    tail -10 "$OUT_DIR/seed-custom.log" | sed 's/^/        /'
  fi
fi

# Emits `table.column|nulls|distinct|sample`, sorted, so two phases can be joined.
column_state() {
  local db="$1"; shift
  local t
  for t in ${@+"$@"}; do
    [ -n "$t" ] || continue
    psql_db "$db" "SELECT '$t.' || col || '|' || nulls || '|' || total || '|' || ndistinct || '|' || coalesce(sample,'') FROM mc_column_state('$t')"
  done | sort -t'|' -k1,1
}
column_state mc_base ${SEED_TABLES[@]+"${SEED_TABLES[@]}"} > "$OUT_DIR/columns-baseline.txt"

fingerprint_db mc_base > "$OUT_DIR/fingerprint-baseline.txt"
BASE_FP="$(sha256sum < "$OUT_DIR/fingerprint-baseline.txt" | cut -d' ' -f1)"
ok "baseline fingerprint ${BASE_FP:0:16}"

: > "$OUT_DIR/rows-baseline.txt"
for t in "${SEED_TABLES[@]:-}"; do
  [ -n "$t" ] || continue
  printf '%s|%s\n' "$t" "$(row_snapshot mc_base "$t")" >> "$OUT_DIR/rows-baseline.txt"
done

# Clone the exact pre-up state so the contention probe can start from it later.
psql_admin "CREATE DATABASE mc_preup TEMPLATE mc_base" >/dev/null

# ---------------------------------------------------------------- 3. up()
head1 "[3/8] up() on PostgreSQL"
UP_LOG_START="$(log_lines)"
ALL_EMITTED=()

# Applies the target set. When the lifecycle checks run, the targets are applied one
# at a time and whatever each one creates is seeded before the next one runs: a later
# target that backfills or deletes rows in a table an earlier target created would
# otherwise be checked against an empty table. `--all` has no lifecycle checks and
# applies the whole history in one call.
apply_targets() { # logfile  seed(yes|no)
  local log="$1" do_seed="$2" f name span_start t
  if [ "$MODE" = "all" ]; then
    artisan mc_base migrate --force "${UP_ARGS[@]}" >> "$log" 2>&1 || return 1
    return 0
  fi
  for f in "${TARGETS[@]}"; do
    name="$(basename "$f" .php)"
    span_start="$(log_lines)"
    artisan mc_base migrate --force --path="database/migrations/$name.php" >> "$log" 2>&1 || return 1
    while IFS= read -r t; do
      if [ -n "$t" ]; then ALL_EMITTED+=("$t"); fi
    done < <(captured_sql "$span_start" | emitted_tables)
    if [ "$do_seed" = "yes" ]; then
      seed_candidates $(static_candidate_tables "$f") ${ALL_EMITTED[@]+"${ALL_EMITTED[@]}"}
    fi
  done
  return 0
}

if ! apply_targets "$OUT_DIR/up.log" yes; then
  bad "up() failed on PostgreSQL"
  tail -30 "$OUT_DIR/up.log" | sed 's/^/        /'
  captured_sql "$UP_LOG_START" > "$OUT_DIR/up-sql.txt"
  exit 1
fi
captured_sql "$UP_LOG_START" > "$OUT_DIR/up-sql.txt"
if [ "${BASE_TABLES:-0}" -lt 1 ]; then
  UP_TABLE_COUNT="$(psql_db mc_base "SELECT count(*) FROM pg_tables WHERE schemaname='public'")"
  [ "${UP_TABLE_COUNT:-0}" -gt 0 ] \
    || die "the migrations produced no tables; artisan did not write to this container"
fi
ok "up() applied cleanly ($(wc -l < "$OUT_DIR/up-sql.txt") statements captured -> $OUT_DIR/up-sql.txt)"

UP_TABLES=()
while IFS= read -r t; do
  if [ -n "$t" ]; then UP_TABLES+=("$t"); fi
done < <(emitted_tables < "$OUT_DIR/up-sql.txt")

# Everything the migration touched, whether or not it existed before: a table the
# migration creates is exactly where a non-idempotent write hides.
SCOPE_TABLES=()
while IFS= read -r t; do
  [ -n "$t" ] || continue
  [ "$t" = "migrations" ] && continue   # Laravel's own bookkeeping, not user data
  if table_exists mc_base "$t"; then SCOPE_TABLES+=("$t"); fi
done < <(printf '%s\n' ${UP_TABLES[@]+"${UP_TABLES[@]}"} ${SEED_TABLES[@]+"${SEED_TABLES[@]}"} | sed '/^$/d' | sort -u)

: > "$OUT_DIR/rows-after-up.txt"
for t in ${SCOPE_TABLES[@]+"${SCOPE_TABLES[@]}"}; do
  [ -n "$t" ] || continue
  printf '%s|%s\n' "$t" "$(row_snapshot mc_base "$t")" >> "$OUT_DIR/rows-after-up.txt"
done
if [ -s "$OUT_DIR/rows-baseline.txt" ]; then
  MUTATED="$(join -t'|' -j1 <(sort "$OUT_DIR/rows-baseline.txt") <(sort "$OUT_DIR/rows-after-up.txt") \
    | awk -F'|' '$2 != $3 { print $1 }' | tr '\n' ' ')"
  if [ -n "${MUTATED// /}" ]; then
    info "up() changed rows in: ${MUTATED% }"
    say "        (the DML it ran is listed under '[8/8] Production impact' with its table and lock)"
  else
    info "up() changed no seeded row; any backfill in this migration had nothing to act on"
  fi
fi

# What did the backfill actually persist? A column whose NULL count fell was filled
# by this migration; the sample shows the value it chose.
column_state mc_base ${SCOPE_TABLES[@]+"${SCOPE_TABLES[@]}"} > "$OUT_DIR/columns-after-up.txt"
# Guarded on the AFTER snapshot, not the baseline one: when every table in scope was
# created by the target set, nothing was seeded at baseline, the baseline file is empty,
# and gating on it skipped the whole report -- including the new-column branch that
# exists precisely for tables the migration created.
if [ -s "$OUT_DIR/columns-after-up.txt" ]; then
  : > "$OUT_DIR/columns-filled.txt"
  # Pre-existing columns whose NULL count fell.
  while IFS='|' read -r key b_null b_total b_dist b_sample a_null a_total a_dist a_sample; do
    [ -n "$key" ] || continue
    if [ "${b_null:-0}" -gt "${a_null:-0}" ] 2>/dev/null; then
      printf '%s: %s of %s row(s) were NULL and are now set; values include: %s\n' \
        "$key" "$((b_null - a_null))" "$a_total" "${a_sample:-<empty>}" >> "$OUT_DIR/columns-filled.txt"
    fi
  done < <(join -t'|' -j1 "$OUT_DIR/columns-baseline.txt" "$OUT_DIR/columns-after-up.txt")

  # Columns the migration created and then populated: the column did not exist
  # before up(), so no baseline row can show the transition.
  while IFS='|' read -r key after_n after_total after_d sample; do
    [ -n "$key" ] || continue
    # "Was anything written" is after_total - after_n, not "is the sample non-empty":
    # a backfill that writes '' makes the sample empty while populating every row, and
    # treating that as absence hid the write entirely.
    [ "$((after_total - after_n))" -gt 0 ] 2>/dev/null || continue
    printf '%s: new column, %s of %s row(s) populated; values include: %s\n' \
      "$key" "$((after_total - after_n))" "$after_total" "${sample:-<empty>}" >> "$OUT_DIR/columns-filled.txt"
  done < <(join -t'|' -j1 -v2 "$OUT_DIR/columns-baseline.txt" "$OUT_DIR/columns-after-up.txt")
  if [ -s "$OUT_DIR/columns-filled.txt" ]; then
    say "  columns this migration filled (was NULL, now set):"
    sed 's/^/    /' "$OUT_DIR/columns-filled.txt"
  else
    info "no column changed from NULL to a value in the seeded tables"
  fi
fi

fingerprint_db mc_base > "$OUT_DIR/fingerprint-after-up.txt"
FP_AFTER_UP="$(sha256sum < "$OUT_DIR/fingerprint-after-up.txt" | cut -d' ' -f1)"
ok "post-up fingerprint ${FP_AFTER_UP:0:16}"

# ------------------------------------------ 4. captured DDL actually took effect
head1 "[4/8] Captured DDL vs resulting catalog"
# Expectations are evaluated against the FINAL catalog, in statement order, with the
# last statement about an object winning. A migration that drops a constraint and
# re-adds it under the same name is not a failure; a migration whose re-added
# constraint has different delete semantics is.
# Expectations are evaluated against the FINAL catalog, in statement order, with the
# last statement about an object winning: a migration that drops a constraint and
# re-adds it under the same name is not a failure, but one whose re-added constraint
# has different delete semantics is.
#
# The parser has to survive raw SQL as well as the schema builder, because this
# repository's pgvector migrations are hand-written:
#   ALTER TABLE ads DROP COLUMN IF EXISTS embedding
#   DROP INDEX CONCURRENTLY IF EXISTS public.ads_embedding_index
#   ALTER INDEX IF EXISTS achievements_key_unique RENAME TO achievements_slug_unique
# Anything it cannot model is reported as unmodelled rather than silently ignored, so a
# missing expectation is visible instead of looking like a pass.
declare -A EXPECT_KIND EXPECT_TABLE EXPECT_OBJECT EXPECT_WANT EXPECT_FK
EXPECT_ORDER=()
UNMODELLED=0

expect_set() { # kind table object want [fk_action]
  local key
  case "$1" in
    idx|ext|fun|trg) key="$1||$3" ;;   # these names are unique per schema
    *)               key="$1|$2|$3" ;;
  esac
  [ -n "${EXPECT_KIND[$key]:-}" ] || EXPECT_ORDER+=("$key")
  EXPECT_KIND[$key]="$1"; EXPECT_TABLE[$key]="$2"; EXPECT_OBJECT[$key]="$3"
  EXPECT_WANT[$key]="$4"; EXPECT_FK[$key]="${5:-}"
}

# A rename retires the old name, so every pending expectation about it is wrong.
#
# Which field holds the name depends on the kind: a table expectation stores it in
# EXPECT_TABLE with an empty EXPECT_OBJECT, so an object-only search left "table
# old_name exists" standing and failed against the correct final catalog.
expect_retired() { # kind name [table]
  local k
  for k in ${EXPECT_ORDER[@]+"${EXPECT_ORDER[@]}"}; do
    case "$1" in
      # A UNIQUE constraint and the index that backs it share one name in PostgreSQL,
      # so `ALTER INDEX x RENAME TO y` also retires the constraint expectation for x.
      idx) [ "${EXPECT_OBJECT[$k]}" = "$2" ] \
             && { [ "${EXPECT_KIND[$k]}" = "idx" ] || [ "${EXPECT_KIND[$k]}" = "con" ]; } \
             && EXPECT_WANT[$k]=0 ;;
      tbl) [ "${EXPECT_KIND[$k]}" = "tbl" ] && [ "${EXPECT_TABLE[$k]}" = "$2" ] && EXPECT_WANT[$k]=0 ;;
      col) [ "${EXPECT_KIND[$k]}" = "col" ] && [ "${EXPECT_TABLE[$k]}" = "$3" ] && [ "${EXPECT_OBJECT[$k]}" = "$2" ] && EXPECT_WANT[$k]=0 ;;
      *)   [ "${EXPECT_KIND[$k]}" = "$1" ] && [ "${EXPECT_OBJECT[$k]}" = "$2" ] && EXPECT_WANT[$k]=0 ;;
    esac
  done
  return 0
}

# A table rename moves the table and everything on it. Re-keying keeps the column and
# constraint expectations pointing at the new name, so they are still verified --
# retiring them instead would silently drop coverage for the renamed table.
expect_rekey_table() { # old new
  local k kind obj want fk newkey
  local -a rebuilt=()
  for k in ${EXPECT_ORDER[@]+"${EXPECT_ORDER[@]}"}; do
    if [ "${EXPECT_TABLE[$k]:-}" = "$1" ]; then
      kind="${EXPECT_KIND[$k]}"; obj="${EXPECT_OBJECT[$k]}"
      want="${EXPECT_WANT[$k]}"; fk="${EXPECT_FK[$k]:-}"
      unset 'EXPECT_KIND[$k]' 'EXPECT_TABLE[$k]' 'EXPECT_OBJECT[$k]' 'EXPECT_WANT[$k]' 'EXPECT_FK[$k]'
      newkey="$kind|$2|$obj"
      EXPECT_KIND[$newkey]="$kind"; EXPECT_TABLE[$newkey]="$2"; EXPECT_OBJECT[$newkey]="$obj"
      EXPECT_WANT[$newkey]="$want"; EXPECT_FK[$newkey]="$fk"
      rebuilt+=("$newkey")
    else
      rebuilt+=("$k")
    fi
  done
  # Rebuilt rather than appended: leaving the old key in EXPECT_ORDER would iterate an
  # entry that no longer exists in the maps, which `set -u` turns into a hard crash.
  EXPECT_ORDER=(${rebuilt[@]+"${rebuilt[@]}"})
  return 0
}

RULE_TMP="$(mktemp)"

# Statements arrive as the server logged them: sometimes lower case from the schema
# builder, sometimes upper case from a hand-written DB::statement. Normalising first
# (case, whitespace, quotes, the public. prefix) collapses all of that, so each shape
# needs one simple pattern instead of one pattern per quoting variant.
normalize_sql() {
  printf '%s' "$1" | tr 'A-Z' 'a-z' \
    | sed -E 's/[[:space:]]+/ /g; s/"//g; s/public\.//g; s/^ +//; s/ +$//'
}

rules_for_statement() {
  local stmt out addcols
  stmt="$(normalize_sql "$1")"
  : > "$RULE_TMP"

  # columns, added and dropped
  out="$(printf '%s' "$stmt" | grep -oE 'alter table (if exists )?(only )?[a-z0-9_]+ (add|drop) column (if (not )?exists )?[a-z0-9_]+' \
        | sed -E -e 's/^alter table (if exists )?(only )?([a-z0-9_]+) add column (if not exists )?([a-z0-9_]+)$/col|\3|\5|1|/' \
                 -e 's/^alter table (if exists )?(only )?([a-z0-9_]+) drop column (if exists )?([a-z0-9_]+)$/col|\3|\5|0|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  # PostgreSQL auto-names an inline column CHECK <table>_<column>_check, so a later
  # migration can recreate a constraint under a name an earlier migration dropped
  # without ever writing that name.
  if printf '%s' "$stmt" | grep -q 'check ('; then
    addcols="$(printf '%s' "$out" | grep '|1|$' || true)"
    if [ "$(printf '%s\n' "$addcols" | grep -c . || true)" = "1" ]; then
      local t c
      t="$(printf '%s' "$addcols" | cut -d'|' -f2)"
      c="$(printf '%s' "$addcols" | cut -d'|' -f3)"
      printf 'con|%s|%s_%s_check|1|\n' "$t" "$t" "$c" >> "$RULE_TMP"
    fi
  fi

  # indexes
  out="$(printf '%s' "$stmt" | grep -oE 'create (unique )?index (concurrently )?(if not exists )?[a-z0-9_]+ on (only )?[a-z0-9_]+' \
        | sed -E 's/^create (unique )?index (concurrently )?(if not exists )?([a-z0-9_]+) on (only )?([a-z0-9_]+)$/idx|\6|\4|1|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  out="$(printf '%s' "$stmt" | grep -oE 'drop index (concurrently )?(if exists )?[a-z0-9_]+' \
        | sed -E 's/^drop index (concurrently )?(if exists )?([a-z0-9_]+)$/idx||\3|0|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  # constraints
  out="$(printf '%s' "$stmt" | grep -oE 'alter table (if exists )?(only )?[a-z0-9_]+ add constraint [a-z0-9_]+( foreign key[^,;]*)?' \
        | sed -E 's/^alter table (if exists )?(only )?([a-z0-9_]+) add constraint ([a-z0-9_]+)(.*)$/con|\3|\4|1|\5/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  out="$(printf '%s' "$stmt" | grep -oE 'alter table (if exists )?(only )?[a-z0-9_]+ drop constraint (if exists )?[a-z0-9_]+' \
        | sed -E 's/^alter table (if exists )?(only )?([a-z0-9_]+) drop constraint (if exists )?([a-z0-9_]+)$/con|\3|\5|0|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  # tables
  out="$(printf '%s' "$stmt" | grep -oE 'create table (if not exists )?[a-z0-9_]+' \
        | sed -E 's/^create table (if not exists )?([a-z0-9_]+)$/tbl|\2||1|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  out="$(printf '%s' "$stmt" | grep -oE 'drop table (if exists )?[a-z0-9_]+' \
        | sed -E 's/^drop table (if exists )?([a-z0-9_]+)$/tbl|\2||0|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  # extensions, functions and triggers.
  # `create or replace function public.f(...)` deliberately has no closing paren in the
  # pattern: the argument list can contain parens of its own.
  out="$(printf '%s' "$stmt" | grep -oE 'create extension (if not exists )?[a-z0-9_]+' \
        | sed -E 's/^create extension (if not exists )?([a-z0-9_]+)$/ext||\2|1|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi
  out="$(printf '%s' "$stmt" | grep -oE 'drop extension (if exists )?[a-z0-9_]+' \
        | sed -E 's/^drop extension (if exists )?([a-z0-9_]+)$/ext||\2|0|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  out="$(printf '%s' "$stmt" | grep -oE 'create (or replace )?function [a-z0-9_.]+' \
        | sed -E 's/^create (or replace )?function ([a-z0-9_.]+)$/fun||\2|1|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi
  out="$(printf '%s' "$stmt" | grep -oE 'drop function (if exists )?[a-z0-9_.]+' \
        | sed -E 's/^drop function (if exists )?([a-z0-9_.]+)$/fun||\2|0|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  out="$(printf '%s' "$stmt" | grep -oE 'create (or replace )?(constraint )?trigger [a-z0-9_]+' \
        | sed -E 's/^create (or replace )?(constraint )?trigger ([a-z0-9_]+)$/trg||\3|1|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi
  out="$(printf '%s' "$stmt" | grep -oE 'drop trigger (if exists )?[a-z0-9_]+' \
        | sed -E 's/^drop trigger (if exists )?([a-z0-9_]+)$/trg||\2|0|/' || true)"
  if [ -n "$out" ]; then printf '%s\n' "$out" >> "$RULE_TMP"; fi

  # renames retire the old name, so they carry no expectation of their own
  printf '%s' "$stmt" | grep -oE 'alter index (if exists )?[a-z0-9_]+ rename to [a-z0-9_]+' \
    | sed -E 's/^alter index (if exists )?([a-z0-9_]+) rename to ([a-z0-9_]+)$/rename_idx|\2|\3/' >> "$RULE_TMP" || true
  printf '%s' "$stmt" | grep -oE 'alter table (if exists )?(only )?[a-z0-9_]+ rename column [a-z0-9_]+ to [a-z0-9_]+' \
    | sed -E 's/^alter table (if exists )?(only )?([a-z0-9_]+) rename column ([a-z0-9_]+) to ([a-z0-9_]+)$/rename_col|\3|\4|\5/' >> "$RULE_TMP" || true
  printf '%s' "$stmt" | grep -oE 'alter table (if exists )?(only )?[a-z0-9_]+ rename to [a-z0-9_]+' \
    | sed -E 's/^alter table (if exists )?(only )?([a-z0-9_]+) rename to ([a-z0-9_]+)$/rename_tbl|\3|\4/' >> "$RULE_TMP" || true

  grep -v '^$' "$RULE_TMP" || true
}

set +e   # the parser below is text processing; "no match" is a normal outcome
: > "$OUT_DIR/unmodelled-ddl.txt"
while IFS= read -r stmt; do
  low="$(normalize_sql "$stmt")"
  case "$low" in
    alter*|create*|drop*) : ;;
    *) continue ;;
  esac

  matched=0
  while IFS='|' read -r kind a b c d; do
    [ -n "$kind" ] || continue
    matched=1
    case "$kind" in
      rename_idx) expect_retired idx "$a"; expect_set idx "" "$b" 1 ;;
      rename_col) expect_retired col "$b" "$a"; expect_set col "$a" "$c" 1 ;;
      # Re-key the children AND keep verifying that the old name is gone. Re-keying
      # alone silently dropped that check: the "table old exists" expectation was
      # moved to the new name, so nothing asserted that the rename happened. The
      # control for this case caught exactly that regression.
      rename_tbl) expect_rekey_table "$a" "$b"; expect_set tbl "$a" "" 0; expect_set tbl "$b" "" 1 ;;
      con)
        fk=""
        if printf '%s' "$d" | grep -q 'foreign key'; then
          # A foreign key with no ON DELETE clause is valid; grep matching nothing
          # must not abort the run under `set -e`.
          fk="$(printf '%s' "$d" | grep -oE 'on delete (cascade|set null|set default|restrict|no action)' | head -1 | sed -E 's/on delete //' | tr 'a-z' 'A-Z' || true)"
        fi
        expect_set con "$a" "$b" "$c" "$fk" ;;
      *) expect_set "$kind" "$a" "$b" "$c" ;;
    esac
  done < <(rules_for_statement "$low")

  # A statement that names a schema object but yields no rule would let an earlier
  # expectation stand unchallenged, which is how a false PASS happens.
  if [ "$matched" = "0" ] && ! printf '%s' "$low" | grep -q 'add primary key' \
     && printf '%s' "$low" | grep -qE 'alter table|create table|drop table|create( unique)? index|drop index'; then
    UNMODELLED=$((UNMODELLED + 1))
    printf '%s\n' "$stmt" >> "$OUT_DIR/unmodelled-ddl.txt"
  fi
done < "$OUT_DIR/up-sql.txt"
set -e

EXPECTATIONS=0
for key in ${EXPECT_ORDER[@]+"${EXPECT_ORDER[@]}"}; do
  # A key whose expectation was retired and re-keyed must not be dereferenced.
  [ -n "${EXPECT_KIND[$key]:-}" ] || continue
  kind="${EXPECT_KIND[$key]}"; table="${EXPECT_TABLE[$key]}"
  object="${EXPECT_OBJECT[$key]}"; want="${EXPECT_WANT[$key]}"
  EXPECTATIONS=$((EXPECTATIONS + 1))
  case "$kind" in
    col) got="$(psql_db mc_base "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='$table' AND column_name='$object'")" ;;
    tbl) got="$(psql_db mc_base "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='$table'")" ;;
    idx) if [ -n "$table" ]; then
           got="$(psql_db mc_base "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND tablename='$table' AND indexname='$object'")"
         else
           got="$(psql_db mc_base "SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname='$object'")"
         fi ;;
    con) got="$(psql_db mc_base "SELECT count(*) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid WHERE c.relname='$table' AND con.conname='$object'")" ;;
    ext) got="$(psql_db mc_base "SELECT count(*) FROM pg_extension WHERE extname='$object'")" ;;
    fun) got="$(psql_db mc_base "SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='$object'")" ;;
    trg) got="$(psql_db mc_base "SELECT count(*) FROM pg_trigger WHERE tgname='$object' AND NOT tgisinternal")" ;;
    *) continue ;;
  esac
  label="$kind $table${object:+.$object}"
  [ "$kind" = "tbl" ] && label="table $table"
  [ "$kind" = "ext" ] && label="extension $object"
  [ "$kind" = "fun" ] && label="function $object"
  [ "$kind" = "trg" ] && label="trigger $object"

  if [ "$want" = "1" ] && [ "$got" != "1" ]; then
    bad "captured DDL says $label exists, but the catalog disagrees"
  elif [ "$want" = "0" ] && [ "$got" != "0" ]; then
    bad "captured DDL says $label was dropped, but it still exists"
  else
    ok "$label $([ "$want" = 1 ] && echo present || echo absent), as the captured DDL claimed"
  fi

  # The semantic half: the same constraint name can come back with different delete
  # semantics, which no name-level check can see.
  fk="${EXPECT_FK[$key]}"
  if [ "$kind" = "con" ] && [ "$want" = "1" ] && [ -n "$fk" ]; then
    def="$(psql_db mc_base "SELECT pg_get_constraintdef(con.oid) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid WHERE c.relname='$table' AND con.conname='$object'")"
    if printf '%s' "$def" | grep -qi "on delete $fk"; then
      ok "  $label carries ON DELETE $fk, as the captured DDL claimed"
    else
      bad "captured DDL created $label with ON DELETE $fk, but the catalog holds: $def"
    fi
  fi
done

if [ "$EXPECTATIONS" = "0" ]; then
  warn "the migration emitted no catalog-verifiable DDL; nothing to cross-check"
else
  ok "$EXPECTATIONS DDL expectation(s) checked against the resulting catalog"
fi
if [ "${UNMODELLED:-0}" -gt 0 ]; then
  info "$UNMODELLED DDL statement(s) named a schema object in a form this checker does not model;"
  info "they are listed in $OUT_DIR/unmodelled-ddl.txt and were not cross-checked"
fi

# -------------------------------------------------------------- 5. double apply
# With --all there is no bounded target set: the "migration" under test is the whole
# history applied from zero, and re-applying or rolling back 118 historical up() bodies
# is not a state production can reach. The idempotency, down() and round-trip checks are
# scoped to the migrations a branch actually adds.
LIFECYCLE_SKIPPED=0
# Initialised here because --all skips the lifecycle and still prints the summary.
DESTROYED_ROWS=0
REPLACED_TABLES=0
DROPPED_TABLES=0
if [ "$MODE" = "all" ]; then
  LIFECYCLE_SKIPPED=1
  head1 "[5-7/8] Idempotency, down() and round trip"
  info "--all: skipped. The full set applied from zero has no bounded target set to"
  info "re-apply or roll back. Point the tool at the migrations a branch adds for those checks."
fi

if [ "$LIFECYCLE_SKIPPED" = "0" ]; then
head1 "[5/8] Double apply (idempotency)"
psql_db mc_base "DELETE FROM migrations WHERE migration IN ($MIG_IN_LIST)" >/dev/null
info "removed ${#TARGETS[@]} row(s) from the migrations table and re-ran the same up()"
info "this is what a re-apply after a failed deploy actually does"

REAPPLY_LOG_START="$(log_lines)"
# seed=no: this must reproduce the apply exactly, and adding rows would look like the
# migration mutated data.
if ! apply_targets "$OUT_DIR/reapply.log" no; then
  bad "the second up() threw; the migration is not safely re-runnable"
  tail -30 "$OUT_DIR/reapply.log" | sed 's/^/        /'
  exit 1
fi
captured_sql "$REAPPLY_LOG_START" > "$OUT_DIR/reapply-sql.txt"
USEFUL_REAPPLY="$(grep -icE 'LOG:  statement: (alter|create|drop|insert|update|delete|truncate)' "$OUT_DIR/reapply-sql.txt" || true)"
[ "$USEFUL_REAPPLY" != "0" ] && info "the second up() still emitted $USEFUL_REAPPLY DDL/DML statement(s); checking what they changed"

fingerprint_db mc_base > "$OUT_DIR/fingerprint-after-reapply.txt"
FP_REAPPLY="$(sha256sum < "$OUT_DIR/fingerprint-after-reapply.txt" | cut -d' ' -f1)"
if [ "$FP_REAPPLY" = "$FP_AFTER_UP" ]; then
  ok "schema unchanged by the second apply: double-apply is a schema no-op"
else
  bad "the second up() changed the schema; double-apply is NOT a no-op"
  diff "$OUT_DIR/fingerprint-after-up.txt" "$OUT_DIR/fingerprint-after-reapply.txt" | head -20 | sed 's/^/        /'
fi

: > "$OUT_DIR/rows-after-reapply.txt"
for t in ${SCOPE_TABLES[@]+"${SCOPE_TABLES[@]}"}; do
  [ -n "$t" ] || continue
  printf '%s|%s\n' "$t" "$(row_snapshot mc_base "$t")" >> "$OUT_DIR/rows-after-reapply.txt"
done
if diff -q "$OUT_DIR/rows-after-up.txt" "$OUT_DIR/rows-after-reapply.txt" >/dev/null; then
  ok "data unchanged by the second apply (the backfill is fill-only)"
else
  bad "the second up() mutated rows; the backfill is not idempotent"
  diff "$OUT_DIR/rows-after-up.txt" "$OUT_DIR/rows-after-reapply.txt" | head -20 | sed 's/^/        /'
fi

# ------------------------------------------------------------------ 6. down()
head1 "[6/8] down() and exactly what it destroys"
DOWN_TABLES=(${SCOPE_TABLES[@]+"${SCOPE_TABLES[@]}"})

# A nullable column is a state the migration itself creates, and it is exactly the
# state a rollback then has to represent. Without this step a down() that deletes
# NULL rows looks harmless, because no NULLs exist yet at rollback time. Every
# nullable column of every table in scope is set to NULL on a few rows first, so the
# destruction report below measures what the rollback really does to that state.
TABLES_SQL="$(printf "'%s'," ${DOWN_TABLES[@]+"${DOWN_TABLES[@]}"} | sed 's/,$//')"
if [ -n "$TABLES_SQL" ]; then
  cat > "$ASSET_DIR/null-states.sql" <<'SQL'
DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = c.table_name
     WHERE c.table_schema = 'public' AND c.is_nullable = 'YES'
       AND c.table_name = ANY (ARRAY[TABLES_PLACEHOLDER])
     ORDER BY c.table_name, c.column_name
  LOOP
    BEGIN
      EXECUTE format('UPDATE public.%I SET %I = NULL WHERE ctid IN (SELECT ctid FROM public.%I LIMIT 3)',
                     r.table_name, r.column_name, r.table_name);
      n := n + 1;
    EXCEPTION WHEN others THEN
      NULL;  -- a column that cannot hold NULL for a domain reason is not our problem
    END;
  END LOOP;
  RAISE NOTICE 'mc_null_states columns=%', n;
END $$;
SQL
  sed -i "s/TABLES_PLACEHOLDER/$TABLES_SQL/" "$ASSET_DIR/null-states.sql"
  NULLED_COLUMNS="$(psql_db_file mc_base "$ASSET_DIR/null-states.sql" 2>&1 | grep -oE 'columns=[0-9]+' | cut -d= -f2 || true)"
  info "made ${NULLED_COLUMNS:-0} nullable column(s) NULL on up to 3 rows each, so down() faces the state up() created"
fi

# `X && Y` as the last command of a loop body makes the loop return 1 when X is false,
# which `set -e` turns into a silent abort -- here, whenever a rollback step drops a
# table and the post-step snapshot finds it gone.
snapshot_scope() { # outfile
  local t
  : > "$1"
  for t in ${DOWN_TABLES[@]+"${DOWN_TABLES[@]}"}; do
    if table_exists mc_base "$t"; then
      printf '%s|%s|%s\n' "$t" "$(row_snapshot mc_base "$t")" "$(row_columns mc_base "$t")" >> "$1"
    fi
  done
  return 0
}

COLS_PRE="$(psql_db mc_base "SELECT count(*) FROM information_schema.columns WHERE table_schema='public'")"
FK_PRE="$(psql_db mc_base "SELECT count(*) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype='f'")"

DOWN_LOG_START="$(log_lines)"
DESTROYED_ROWS=0
REPLACED_TABLES=0
DROPPED_TABLES=0
: > "$OUT_DIR/down.log"
say "  destroyed by down():"

# Rolled back one migration at a time, snapshotting between steps, for two reasons:
#
#   1. destruction is attributed to the migration that caused it, instead of being
#      netted out across the batch; and
#   2. a table that a target created and then removes is not confused with rows
#      deleted from a table that survives. Dropping a table the target set created is
#      what rolling back a CREATE means; deleting rows from a table that is still
#      there is data loss. Comparing only the final state cannot tell them apart.
STEP=$((${#TARGETS[@]} - 1))
while [ "$STEP" -ge 0 ]; do
  name="$(basename "${TARGETS[$STEP]}" .php)"
  pre="$OUT_DIR/rows-pre-step-$STEP.txt"; post="$OUT_DIR/rows-post-step-$STEP.txt"
  snapshot_scope "$pre"
  if ! artisan mc_base migrate:rollback --force --step=1 --path="database/migrations/$name.php" >> "$OUT_DIR/down.log" 2>&1; then
    bad "down() failed on PostgreSQL while rolling back $name"
    tail -30 "$OUT_DIR/down.log" | sed 's/^/        /'
    exit 1
  fi
  # `--step=1` rolls back whatever Laravel considers most recent, ordered by name. If
  # that is not the migration this step intended, every attribution below would be
  # wrong, so say so instead of reporting a plausible-looking audit.
  if [ "$(psql_db mc_base "SELECT count(*) FROM migrations WHERE migration='$name'")" != "0" ]; then
    bad "rollback step $STEP did not remove $name from the migrations table; the destruction audit below cannot be trusted"
    exit 1
  fi
  snapshot_scope "$post"

  while IFS= read -r line; do
    [ -n "$line" ] || continue
    t="${line%%|*}"; rest="${line#*|}"; before="${rest%%|*}"; rest="${rest#*|}"
    before_hash="${rest%%|*}"; before_cols="${rest#*|}"
    if table_exists mc_base "$t"; then
      after_raw="$(row_snapshot mc_base "$t")"
      after="${after_raw%%|*}"; after_hash="${after_raw#*|}"
      after_cols="$(row_columns mc_base "$t")"
      if [ "$before_cols" != "$after_cols" ]; then
        common="$(list_intersect "$before_cols" "$after_cols")"
        before_hash="$(row_snapshot_over mc_base "$t" "$common" | cut -d'|' -f2)"
        after_hash="$(row_snapshot_over mc_base "$t" "$common" | cut -d'|' -f2)"
      fi
      if [ "$before" -gt "$after" ] 2>/dev/null; then
        say "    rows    : $t $before -> $after (destroyed $((before - after)) by $name)"
        DESTROYED_ROWS=$((DESTROYED_ROWS + before - after))
      elif [ "$before" = "$after" ] && [ "$before_hash" != "$after_hash" ]; then
        # Same cardinality, different content: a rollback that deletes the records and
        # inserts replacements, or truncates and repopulates. Comparing counts alone
        # reported this as "destroyed no rows" while every original record was gone.
        say "    rows    : $t $before row(s), all replaced by different content (by $name)"
        REPLACED_TABLES=$((REPLACED_TABLES + 1))
      fi
    elif [ -n "${BASE_TABLE_PRESENT[$t]:-}" ]; then
      # A table that existed before the targets ran and is gone now: the rollback
      # removed pre-existing data, whatever the row count was.
      say "    table   : $t existed before the migration and was dropped by $name"
      DESTROYED_ROWS=$((DESTROYED_ROWS + before))
    else
      # The target set created it; removing it is what rolling back a CREATE means.
      say "    table   : $t (created by the target set) was dropped by $name"
      DROPPED_TABLES=$((DROPPED_TABLES + 1))
    fi
  done < "$pre"
  STEP=$((STEP - 1))
done

captured_sql "$DOWN_LOG_START" > "$OUT_DIR/down-sql.txt"
ok "down() completed"

COLS_POST="$(psql_db mc_base "SELECT count(*) FROM information_schema.columns WHERE table_schema='public'")"
FK_POST="$(psql_db mc_base "SELECT count(*) FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype='f'")"
say "    schema  : $((COLS_PRE - COLS_POST)) column(s) dropped, $((FK_PRE - FK_POST)) foreign key(s) removed"

# The audit is only as good as its scope. If down() touched a table that was never
# snapshotted, "destroyed no rows" does not cover it, and staying quiet about that
# would be precisely the silent under-report this tool exists to prevent.
UNAUDITED=()
while IFS= read -r t; do
  [ -n "$t" ] || continue
  [ "$t" = "migrations" ] && continue
  in_list "$t" ${DOWN_TABLES[@]+"${DOWN_TABLES[@]}"} || UNAUDITED+=("$t")
done < <(emitted_tables < "$OUT_DIR/down-sql.txt")
if [ "${#UNAUDITED[@]}" -gt 0 ]; then
  bad "down() touched table(s) outside the audited scope, so no destruction verdict covers them: ${UNAUDITED[*]}"
fi
if [ "$DESTROYED_ROWS" = "0" ] && [ "$REPLACED_TABLES" = "0" ]; then
  ok "down() destroyed no rows in the tables this migration touches"
elif [ "$ALLOW_DOWN_DATA_LOSS" = "1" ]; then
  warn "down() destroyed $DESTROYED_ROWS row(s) and replaced the contents of $REPLACED_TABLES table(s) (accepted via --allow-down-data-loss)"
else
  bad "down() destroyed $DESTROYED_ROWS row(s) and replaced the contents of $REPLACED_TABLES table(s); a rollback that deletes or rewrites records is not reversible (re-run with --allow-down-data-loss once that is accepted)"
fi

# -------------------------------------------------------- 7. schema round trip
head1 "[7/8] up() -> down() round trip against the baseline schema"
fingerprint_db mc_base > "$OUT_DIR/fingerprint-after-down.txt"
FP_AFTER_DOWN="$(sha256sum < "$OUT_DIR/fingerprint-after-down.txt" | cut -d' ' -f1)"
if [ "$FP_AFTER_DOWN" = "$BASE_FP" ]; then
  ok "down() restored the pre-migration schema exactly"
else
  bad "down() did not restore the baseline schema"
  diff "$OUT_DIR/fingerprint-baseline.txt" "$OUT_DIR/fingerprint-after-down.txt" | head -30 | sed 's/^/        /'
fi

fi  # end of the idempotency / down() / round-trip lifecycle

# ---------------------------------------------------------------- 8. production
head1 "[8/8] Production impact: locks and table sizes"
say "  Statements that take locks (levels listed from the statement class):"
LOCK_ROWS=0; prev=""
while IFS= read -r stmt; do
  cls="$(lock_class "$stmt")"
  [ -n "$cls" ] || continue
  short="$(printf '%s' "$stmt" | cut -c1-110)"
  [ "$short" = "$prev" ] && continue
  prev="$short"; LOCK_ROWS=$((LOCK_ROWS+1))
  tbl="$(statement_table "$stmt")"; rows="n/a"
  [ -n "$tbl" ] && rows="$(production_row_count "$tbl")"
  say "    - $short"
  say "        lock: $cls"
  [ -n "$tbl" ] && say "        table: $tbl, production rows: $rows"
done < "$OUT_DIR/up-sql.txt"
[ "$LOCK_ROWS" = "0" ] && say "    (no lock-taking statement captured)"

if [ "$LOCK_PROBE" = "1" ]; then
  say ""
  say "  Contention probe — measured, not inferred:"
  probe_contention mc_probe_a "ACCESS SHARE" "$OUT_DIR/probe-a.txt" "holding ACCESS SHARE on every table"
  if [ "$PROBE_BLOCKED" = "1" ]; then
    say "    holding ROW EXCLUSIVE on every table: skipped — ACCESS EXCLUSIVE is strictly stronger than any lock this probe could reveal"
  else
    probe_contention mc_probe_b "ROW EXCLUSIVE" "$OUT_DIR/probe-b.txt" "holding ROW EXCLUSIVE on every table"
  fi

  # A foreign key takes SHARE ROW EXCLUSIVE on the table it references — a second
  # table the migration body never names, and the one a reviewer is least likely to
  # expect. Hold ROW EXCLUSIVE on that table alone and see whether the migration
  # stalls on it.
  while IFS= read -r ref; do
    [ -n "$ref" ] || continue
    probe_contention "mc_probe_ref_$ref" "ROW EXCLUSIVE" "$OUT_DIR/probe-ref-$ref.txt" \
      "holding ROW EXCLUSIVE only on referenced table $ref" "$ref"
  done < <(grep -oiE 'references[[:space:]]+"?[a-z0-9_]+"?' "$OUT_DIR/up-sql.txt" | grep -oiE '[a-z0-9_]+"?$' | tr -d '"' | sort -u)
fi

# -------------------------------------------------------------------- summary
END_TIME=$(date +%s)
head1 "Result"
say "  elapsed   : $((END_TIME - START_TIME))s"
say "  artifacts : $OUT_DIR"
say "  failures  : ${#FAILURES[@]}"
for f in ${FAILURES[@]+"${FAILURES[@]}"}; do say "    - $f"; done
say "  warnings  : ${#WARNINGS[@]}"
for w in ${WARNINGS[@]+"${WARNINGS[@]}"}; do say "    - $w"; done

{
  printf 'migration_check_version=1\n'
  printf 'head=%s\n' "$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo unknown)"
  printf 'targets=%s\n' "${#TARGETS[@]}"
  printf 'elapsed_seconds=%s\n' "$((END_TIME - START_TIME))"
  printf 'failures=%s\n' "${#FAILURES[@]}"
  printf 'warnings=%s\n' "${#WARNINGS[@]}"
  printf 'down_destroyed_rows=%s\n' "$DESTROYED_ROWS"
  printf 'down_replaced_tables=%s\n' "$REPLACED_TABLES"
  printf 'down_dropped_target_tables=%s\n' "$DROPPED_TABLES"
  printf 'schema_after_up=%s\n' "$FP_AFTER_UP"
  printf 'schema_baseline=%s\n' "$BASE_FP"
  printf 'up_sql_statements=%s\n' "$(wc -l < "$OUT_DIR/up-sql.txt")"
} > "$OUT_DIR/summary.txt"

if [ "${#FAILURES[@]}" -gt 0 ]; then say ""; say "RESULT: FAIL"; exit 1; fi
if [ "$STRICT" = "1" ] && [ "${#WARNINGS[@]}" -gt 0 ]; then
  say ""; say "RESULT: FAIL (--strict, ${#WARNINGS[@]} warning(s))"; exit 1
fi
say ""
say "RESULT: PASS"
exit 0
