#!/usr/bin/env bash
#
# Negative control for scripts/verify-migrations-postgres.sh.
#
# The gate this tests exists because no check in this repository had ever executed
# the PostgreSQL DDL production runs. A gate added to fix that is worthless unless
# something proves it can fail, so each case below installs a deliberately broken
# migration, runs the real tool against the real engine, and requires the tool to
# both exit non-zero AND print the specific diagnostic that names the defect.
#
#   A. positive control  — a purely additive, reversible migration must PASS
#   B. broken up()       — DDL that cannot apply must FAIL on the apply step
#   C. non-idempotent    — a second apply that mutates rows must FAIL
#   D. lossy down()      — a rollback that deletes records must FAIL and say how many
#
# Case A matters as much as B-D: a gate that can only ever fail is not a control.
#
# Requires docker, php with pdo_pgsql, and backend/vendor. Set
# MIGVERIFY_TEST_REQUIRE_DOCKER=1 to turn a missing prerequisite into a failure
# instead of a skip (CI does this).
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOL="$ROOT_DIR/scripts/verify-migrations-postgres.sh"
MIGRATIONS_DIR="$ROOT_DIR/backend/database/migrations"
# Unique per invocation: two concurrent or overlapping runs of this control must not
# delete each other's fixture. The 2099 date keeps it last in migration order.
FIXTURE="$MIGRATIONS_DIR/2099_01_01_000001_migverify_fixture_$$_${RANDOM}.php"
OUT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/migverify-control.XXXXXX")"

cleanup() {
  rm -f "$FIXTURE"
  if [ "${MIGVERIFY_TEST_KEEP:-0}" = "1" ]; then
    printf 'kept control artifacts in %s\n' "$OUT_DIR"
  else
    rm -rf "$OUT_DIR"
  fi
}
trap cleanup EXIT

failures=0
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }

skip_or_fail() {
  if [ "${MIGVERIFY_TEST_REQUIRE_DOCKER:-0}" = "1" ]; then
    fail "$1"
  else
    printf 'SKIP: %s\n' "$1"
    exit 0
  fi
}

command -v docker >/dev/null 2>&1 || skip_or_fail "docker is not available"
docker info >/dev/null 2>&1 || skip_or_fail "cannot talk to the docker daemon"
[ -d "$ROOT_DIR/backend/vendor" ] || skip_or_fail "backend/vendor is missing; run composer install"
php -m 2>/dev/null | grep -qx 'pdo_pgsql' || skip_or_fail "php has no pdo_pgsql extension"
[ -f "$TOOL" ] || { echo "tool not found: $TOOL" >&2; exit 2; }

# Runs the tool against one fixture and captures output. Echoes the exit code.
run_case() {
  local name="$1" expect_rc="$2" expect_text="$3"
  local log="$OUT_DIR/$name.log" rc=0
  rm -f "$FIXTURE"
  cat > "$FIXTURE"
  bash "$TOOL" --seed-rows=3 --no-lock-probe --no-production-counts \
    --out-dir="$OUT_DIR/$name" "$FIXTURE" > "$log" 2>&1 || rc=$?
  rm -f "$FIXTURE"

  if [ "$expect_rc" = "0" ] && [ "$rc" != "0" ]; then
    fail "$name: expected PASS, got exit $rc (see $log)"
    tail -12 "$log" | sed 's/^/        /'
    return
  fi
  if [ "$expect_rc" != "0" ] && [ "$rc" = "0" ]; then
    fail "$name: expected a non-zero exit, but the tool reported PASS"
    return
  fi
  if ! grep -qF "$expect_text" "$log"; then
    fail "$name: exit code was right but the expected diagnostic did not appear: '$expect_text' (see $log)"
    return
  fi
  if [ "$expect_rc" = "0" ]; then
    pass "$name: exit 0 and the tool reported PASS"
  else
    pass "$name: exit $rc and the tool named the defect"
  fi
}

echo "== Migration verification gate: negative control =="

# A. Positive control. Purely additive, guarded, reversible.
run_case "A-additive-passes" 0 "RESULT: PASS" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('migverify_probe')) {
            return;
        }

        Schema::create('migverify_probe', function (Blueprint $table): void {
            $table->id();
            $table->string('label')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_probe');
    }
};
PHP

# B. up() cannot apply: the referenced table does not exist. Only a real engine
#    rejects this; reading the file cannot.
run_case "B-broken-up-fails" 1 "up() failed on PostgreSQL" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('alter table "payments" add column "migverify_bad" integer references "definitely_no_such_table" ("id")');
    }

    public function down(): void
    {
        DB::statement('alter table "payments" drop column if exists "migverify_bad"');
    }
};
PHP

# C. up() is guarded for the table but not for its own write, so a re-apply after a
#    failed deploy adds a second row. The schema is unchanged, which is why only a
#    data-level idempotency check catches it.
run_case "C-non-idempotent-fails" 1 "the second up() mutated rows; the backfill is not idempotent" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('migverify_counter')) {
            Schema::create('migverify_counter', function (Blueprint $table): void {
                $table->id();
                $table->unsignedInteger('runs')->default(0);
            });
        }

        DB::table('migverify_counter')->insert(['runs' => 1]);
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_counter');
    }
};
PHP

# D. down() deletes consent-shaped evidence to satisfy a NOT NULL it is restoring.
#    Exactly the shape that looks reversible in a diff.
run_case "D-lossy-down-fails" 1 "down() destroyed 3 row(s)" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('payments') || Schema::hasColumn('payments', 'migverify_soft_ref')) {
            return;
        }

        Schema::table('payments', function (Blueprint $table): void {
            $table->string('migverify_soft_ref')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('payments')) {
            return;
        }

        // Rows the migration made representable, dropped so NOT NULL can return.
        DB::table('payments')->whereNull('migverify_soft_ref')->delete();

        if (Schema::hasColumn('payments', 'migverify_soft_ref')) {
            Schema::table('payments', function (Blueprint $table): void {
                $table->dropColumn('migverify_soft_ref');
            });
        }
    }
};
PHP

echo ""
if [ "$failures" -gt 0 ]; then
  echo "RESULT: FAIL ($failures case(s))"
  exit 1
fi
echo "RESULT: PASS (4 control cases)"
