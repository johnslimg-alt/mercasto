#!/usr/bin/env bash
#
# Negative control for scripts/verify-migrations-postgres.sh.
#
# The gate this tests exists because no check in this repository had ever executed the
# PostgreSQL DDL production runs. A gate added to fix that is worthless unless something
# proves it can fail, so every case below installs a deliberately broken migration, runs
# the real tool against the real engine, and requires the tool to both exit with the
# expected code AND print the specific diagnostic that names the defect.
#
# Case A is the positive control and matters as much as the rest: a gate that can only
# ever fail is not a control either.
#
#   A  additive, reversible migration                       -> PASS
#   B  up() that cannot apply                              -> FAIL on the apply step
#   C  non-idempotent re-apply                             -> FAIL on the data comparison
#   D  down() that deletes records                         -> FAIL and says how many
#   E  target modifies history, a successor depends on it   -> PASS (predecessor baseline)
#   F  later target deletes rows from a table an earlier
#      target created                                        -> FAIL (target-created tables seeded)
#   G  down() rewrites a table to the same cardinality      -> FAIL (row identity, not just count)
#   H  down() leaves a function behind                      -> FAIL on the round-trip fingerprint
#   I  table created then renamed                       -> PASS (rename retires the old expectation)
#   M  column added and filled with '' on every row        -> PASS, and the fill report says <empty>
#   S  down() drops a column and replaces every row too    -> FAIL (identity captured pre-rollback)
#
# Cases J, K, L, N, O, P and R are cheap and need no container: option parsing, target
# selection for a renamed migration, the workflow's push-run comparison base, a deleted
# migration, the contiguous-range expansion, and the unique-index lock classification.
#
# Requires docker, php with pdo_pgsql, and backend/vendor. Set
# MIGVERIFY_TEST_REQUIRE_DOCKER=1 to turn a missing prerequisite into a failure
# instead of a skip (CI does this).
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOL="$ROOT_DIR/scripts/verify-migrations-postgres.sh"
MIGRATIONS_DIR="$ROOT_DIR/backend/database/migrations"
WORKFLOW="$ROOT_DIR/.github/workflows/migration-postgres-gate.yml"
# Every fixture this control installs carries this infix, so cleanup is one glob and
# cannot touch a real migration.
FIXTURE_GLOB="$MIGRATIONS_DIR/2099_01_01_*migverify*.php"
OUT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/migverify-control.XXXXXX")"
SCRATCH=""

cleanup() {
  rm -f $FIXTURE_GLOB
  if [ -n "$SCRATCH" ]; then rm -rf "$SCRATCH"; fi
  if [ "${MIGVERIFY_TEST_KEEP:-0}" = "1" ]; then
    printf 'kept control artifacts in %s\n' "$OUT_DIR"
  else
    rm -rf "$OUT_DIR"
  fi
}
trap cleanup EXIT

failures=0
total=0
pass() { printf '  PASS  %s\n' "$*"; }
fail() { printf '  FAIL  %s\n' "$*"; failures=$((failures + 1)); }

skip_or_fail() {
  if [ "${MIGVERIFY_TEST_REQUIRE_DOCKER:-0}" = "1" ]; then
    fail "$1"
    printf '\nRESULT: FAIL (%s case(s))\n' "$failures"
    exit 1
  fi
  printf 'SKIP: %s\n' "$1"
  exit 0
}

# Writes one fixture. Deliberately does NOT clear the others: cases E, F and G install
# two files, and clearing on every write left only the last one in place -- which made
# those cases test a single fixture and pass for the wrong reason.
fixture() { # filename-suffix ; body on stdin
  cat > "$MIGRATIONS_DIR/2099_01_01_$1"
}
clear_fixtures() { rm -f $FIXTURE_GLOB; }

# Runs the tool against every fixture currently installed.
run_tool() { # name expect_rc pipe-separated-expected-strings
  local name="$1" expect_rc="$2" expect_text="$3"
  local log="$OUT_DIR/$name.log" rc=0 want
  total=$((total + 1))
  bash "$TOOL" --seed-rows=3 --no-lock-probe --no-production-counts \
    --out-dir="$OUT_DIR/$name" $(ls -1 $FIXTURE_GLOB 2>/dev/null) > "$log" 2>&1 || rc=$?
  rm -f $FIXTURE_GLOB

  if [ "$expect_rc" = "0" ] && [ "$rc" != "0" ]; then
    fail "$name: expected PASS, got exit $rc (see $log)"
    tail -14 "$log" | sed 's/^/        /'
    return
  fi
  if [ "$expect_rc" != "0" ] && [ "$rc" = "0" ]; then
    fail "$name: expected a non-zero exit, but the tool reported PASS"
    return
  fi
  local IFS='|'
  for want in $expect_text; do
    # A leading ! means the string must NOT appear: some fixes are the absence of a
    # false claim rather than the presence of a diagnostic.
    if [ "${want#!}" != "$want" ]; then
      if grep -qF "${want#!}" "$log"; then
        fail "$name: the log contains '${want#!}', which must not appear (see $log)"
        return
      fi
      continue
    fi
    if ! grep -qF "$want" "$log"; then
      fail "$name: exit code was right but the expected diagnostic did not appear: '$want' (see $log)"
      return
    fi
  done
  if [ "$expect_rc" = "0" ]; then
    pass "$name: exit 0 and the tool reported PASS"
  else
    pass "$name: exit $rc and the tool named the defect"
  fi
}

echo "== Migration verification gate: negative control =="

# ---------------------------------------------------------------- no container
[ -f "$WORKFLOW" ] || { echo "workflow not found: $WORKFLOW" >&2; exit 2; }

# Case J: --require-targets must survive option parsing. It used to be reset to 0
# after the argument loop, so an explicit demand to fail on an empty selection
# returned success.
total=$((total + 1))
rc=0
bash "$TOOL" --static-only --require-targets --base=HEAD > "$OUT_DIR/J.log" 2>&1 || rc=$?
if [ "$rc" = "0" ]; then
  fail "J-require-targets-is-honoured: an empty selection with --require-targets exited 0"
elif ! grep -q 'no migrations selected' "$OUT_DIR/J.log"; then
  fail "J-require-targets-is-honoured: exited $rc but without the 'no migrations selected' diagnostic"
else
  pass "J-require-targets-is-honoured: exit $rc and the tool refused an empty selection"
fi

# Case K: a renamed migration is classified R, not A, and must still be selected --
# renaming a migration changes its recorded name, so Laravel can run it again.
total=$((total + 1))
SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/migverify-scratch.XXXXXX")"
mkdir -p "$SCRATCH/backend/database/migrations" "$SCRATCH/scripts"
cp "$TOOL" "$SCRATCH/scripts/"
printf '<?php\n' > "$SCRATCH/backend/database/migrations/2026_01_01_000001_alpha.php"
printf '<?php\n' > "$SCRATCH/backend/database/migrations/2026_01_01_000002_beta.php"
( cd "$SCRATCH" && git init -q . && git add -A \
  && git -c user.email=t@example.invalid -c user.name=control commit -qm base \
  && git mv backend/database/migrations/2026_01_01_000001_alpha.php \
            backend/database/migrations/2026_01_01_000001_alpha_renamed.php \
  && git add -A && git -c user.email=t@example.invalid -c user.name=control commit -qm rename ) >/dev/null 2>&1
k_out="$(bash "$SCRATCH/scripts/verify-migrations-postgres.sh" --static-only --base=HEAD~1 2>&1 || true)"
if printf '%s' "$k_out" | grep -q 'alpha_renamed\.php'; then
  pass "K-renamed-migration-is-selected: the destination path was selected"
else
  fail "K-renamed-migration-is-selected: a renamed migration produced no targets"
  printf '%s\n' "$k_out" | head -6 | sed 's/^/        /'
fi

# Case N: a deletion-only change selected nothing and exited 0, so the gate silently
# skipped a change that alters what a fresh install runs.
total=$((total + 1))
rm -rf "$SCRATCH"; SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/migverify-scratch.XXXXXX")"
mkdir -p "$SCRATCH/backend/database/migrations" "$SCRATCH/scripts"
cp "$TOOL" "$SCRATCH/scripts/"
printf '<?php\n' > "$SCRATCH/backend/database/migrations/2026_01_01_000001_alpha.php"
( cd "$SCRATCH" && git init -q . && git add -A \
  && git -c user.email=t@example.invalid -c user.name=control commit -qm base \
  && git rm -q backend/database/migrations/2026_01_01_000001_alpha.php \
  && git -c user.email=t@example.invalid -c user.name=control commit -qm delete ) >/dev/null 2>&1
rc=0
n_out="$(bash "$SCRATCH/scripts/verify-migrations-postgres.sh" --static-only --base=HEAD~1 2>&1)" || rc=$?
if [ "$rc" != "0" ] && printf '%s' "$n_out" | grep -q 'were deleted against'; then
  pass "N-deleted-migration-refused: exit $rc and the tool named the deleted migration"
else
  fail "N-deleted-migration-refused: exit $rc without the deletion diagnostic"
  printf '%s\n' "$n_out" | head -5 | sed 's/^/        /'
fi

# Case O: two historical targets with an untouched migration between them must pull
# that migration into the verified range, or the later target runs against a schema
# that never existed at that point in history.
total=$((total + 1))
rm -rf "$SCRATCH"; SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/migverify-scratch.XXXXXX")"
mkdir -p "$SCRATCH/backend/database/migrations" "$SCRATCH/scripts"
cp "$TOOL" "$SCRATCH/scripts/"
for n in 000001_alpha 000002_between 000003_gamma; do
  printf '<?php\n' > "$SCRATCH/backend/database/migrations/2026_01_01_$n.php"
done
( cd "$SCRATCH" && git init -q . && git add -A \
  && git -c user.email=t@example.invalid -c user.name=control commit -qm base ) >/dev/null 2>&1
o_out="$(bash "$SCRATCH/scripts/verify-migrations-postgres.sh" --static-only \
  "$SCRATCH/backend/database/migrations/2026_01_01_000001_alpha.php" \
  "$SCRATCH/backend/database/migrations/2026_01_01_000003_gamma.php" 2>&1 || true)"
if printf '%s' "$o_out" | grep -q '000002_between'; then
  pass "O-intervening-migration-included: the untouched migration between two targets was verified too"
else
  fail "O-intervening-migration-included: the intervening migration was skipped"
  printf '%s\n' "$o_out" | head -6 | sed 's/^/        /'
fi

# Case P: CREATE UNIQUE INDEX takes the same lock as CREATE INDEX. It was absent from
# the production-impact report entirely because both index branches required the bare
# spelling.
total=$((total + 1))
p_ok=1
for probe in 'create unique index "i" on "t" ("c"):SHARE' \
             'create unique index concurrently "i" on "t" ("c"):SHARE UPDATE EXCLUSIVE' \
             'create index "i" on "t" ("c"):SHARE'; do
  stmt="${probe%%:*}"; want="${probe##*:}"
  got="$(sed -n '/^lock_class() {/,/^}/p' "$TOOL" > "$OUT_DIR/lock_class.sh"; . "$OUT_DIR/lock_class.sh"; lock_class "$stmt")"
  case "$got" in *"$want"*) : ;; *) p_ok=0; printf '        %s -> %s\n' "$stmt" "${got:-<empty>}" ;; esac
done
if [ "$p_ok" = "1" ]; then
  pass "P-unique-index-lock-classified: unique index creation reports its lock in all three forms"
else
  fail "P-unique-index-lock-classified: a unique index form was not classified"
fi

# Case L: the workflow must not leave push runs comparing HEAD with HEAD. Wiring
# assertion: the base ref for a push comes from github.event.before and is passed
# through to --base.
total=$((total + 1))
if grep -q 'github.event.before' "$WORKFLOW" && grep -q -- '--base=' "$WORKFLOW"; then
  pass "L-push-run-base: the workflow derives the base from github.event.before and passes --base"
else
  fail "L-push-run-base: the workflow can still compare a push against HEAD and verify nothing"
fi

# Case R: a migration can execute application code, so a change to a helper changes what
# a fresh install persists without touching any migration file. The workflow triggers on
# backend/app/Support/**, and the verifier selects the migrations that depend on whatever
# helper changed.
total=$((total + 1))
rm -rf "$SCRATCH"; SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/migverify-scratch.XXXXXX")"
mkdir -p "$SCRATCH/backend/database/migrations" "$SCRATCH/backend/app/Support" "$SCRATCH/scripts"
cp "$TOOL" "$SCRATCH/scripts/"
cat > "$SCRATCH/backend/database/migrations/2026_01_01_000001_uses_helper.php" <<'PHP'
<?php

use App\Support\MigverifyHelper;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        MigverifyHelper::run();
    }

    public function down(): void
    {
    }
};
PHP
printf '<?php\n' > "$SCRATCH/backend/database/migrations/2026_01_01_000002_unrelated.php"
printf '<?php\nclass MigverifyHelper { public static function run(): void {} }\n' > "$SCRATCH/backend/app/Support/MigverifyHelper.php"
( cd "$SCRATCH" && git init -q . && git add -A \
  && git -c user.email=t@example.invalid -c user.name=control commit -qm base \
  && printf '<?php\nclass MigverifyHelper { public static function run(): void { /* changed */ } }\n' > backend/app/Support/MigverifyHelper.php \
  && git add -A && git -c user.email=t@example.invalid -c user.name=control commit -qm "change helper" ) >/dev/null 2>&1
r_out="$(bash "$SCRATCH/scripts/verify-migrations-postgres.sh" --static-only --base=HEAD~1 2>&1 || true)"
if printf '%s' "$r_out" | grep -q 'uses_helper.php' && printf '%s' "$r_out" | grep -q 'depends on the changed'; then
  pass "R-support-dependency-selected: the dependent migration was selected after its helper changed"
else
  fail "R-support-dependency-selected: a helper-only change selected no migration"
  printf '%s\n' "$r_out" | head -6 | sed 's/^/        /'
fi
rm -rf "$SCRATCH"

# ---------------------------------------------------------------- with container
command -v docker >/dev/null 2>&1 || skip_or_fail "docker is not available"
docker info >/dev/null 2>&1 || skip_or_fail "cannot talk to the docker daemon"
[ -d "$ROOT_DIR/backend/vendor" ] || skip_or_fail "backend/vendor is missing; run composer install"
php -m 2>/dev/null | grep -qx 'pdo_pgsql' || skip_or_fail "php has no pdo_pgsql extension"
[ -f "$TOOL" ] || { echo "tool not found: $TOOL" >&2; exit 2; }

# A. Positive control. Purely additive, guarded, reversible.
clear_fixtures
fixture "000001_migverify_a_$$.php" <<'PHP'
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
run_tool "A-additive-passes" 0 "RESULT: PASS|!up() changed rows in:"

# B. up() cannot apply: the referenced table does not exist. Only a real engine
#    rejects this; reading the file cannot.
clear_fixtures
fixture "000001_migverify_b_$$.php" <<'PHP'
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
run_tool "B-broken-up-fails" 1 "up() failed on PostgreSQL"

# C. up() is guarded for the table but not for its own write, so a re-apply after a
#    failed deploy adds a second row. The schema is unchanged, which is why only a
#    data-level idempotency check catches it.
clear_fixtures
fixture "000001_migverify_c_$$.php" <<'PHP'
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
run_tool "C-non-idempotent-fails" 1 "the second up() mutated rows; the backfill is not idempotent"

# D. down() deletes consent-shaped evidence to satisfy a NOT NULL it is restoring.
#    Exactly the shape that looks reversible in a diff.
clear_fixtures
fixture "000001_migverify_d_$$.php" <<'PHP'
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

        DB::table('payments')->whereNull('migverify_soft_ref')->delete();

        if (Schema::hasColumn('payments', 'migverify_soft_ref')) {
            Schema::table('payments', function (Blueprint $table): void {
                $table->dropColumn('migverify_soft_ref');
            });
        }
    }
};
PHP
run_tool "D-lossy-down-fails" 1 "down() destroyed 3 row(s)"

clear_fixtures

# E. The target is a historical migration and a later migration alters what it
#    creates. Including that successor in the baseline makes the baseline itself fail,
#    so the target is never exercised: the baseline must be its predecessors.
fixture "000001_migverify_e_hist_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('migverify_hist')) {
            return;
        }

        Schema::create('migverify_hist', function (Blueprint $table): void {
            $table->id();
            $table->string('c1')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_hist');
    }
};
PHP
fixture "000002_migverify_e_successor_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Not a target: it exists only to depend on what the target creates.
    public function up(): void
    {
        if (! Schema::hasTable('migverify_hist') || ! Schema::hasColumn('migverify_hist', 'c1')) {
            return;
        }

        Schema::table('migverify_hist', function (Blueprint $table): void {
            $table->dropColumn('c1');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('migverify_hist') || Schema::hasColumn('migverify_hist', 'c1')) {
            return;
        }

        Schema::table('migverify_hist', function (Blueprint $table): void {
            $table->string('c1')->nullable();
        });
    }
};
PHP
total=$((total + 1))
rc=0
bash "$TOOL" --seed-rows=3 --no-lock-probe --no-production-counts \
  --out-dir="$OUT_DIR/E" \
  "$MIGRATIONS_DIR/2099_01_01_000001_migverify_e_hist_$$.php" > "$OUT_DIR/E.log" 2>&1 || rc=$?
rm -f $FIXTURE_GLOB
if [ "$rc" = "0" ] && grep -qF "RESULT: PASS" "$OUT_DIR/E.log" \
   && grep -qE '1 later migration\(s\) excluded from the baseline' "$OUT_DIR/E.log"; then
  pass "E-historical-target-passes: exit 0, predecessor baseline, successor excluded"
else
  fail "E-historical-target-passes: exit $rc (see $OUT_DIR/E.log)"
  tail -12 "$OUT_DIR/E.log" | sed 's/^/        /'
fi

clear_fixtures

# F. Two targets: the first creates a table, the second's down() deletes rows from it.
#    If a table created by an earlier target is not seeded before the next target runs,
#    the later target's row-loss check has no rows to observe and passes vacuously.
fixture "000001_migverify_f_create_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('migverify_seq')) {
            return;
        }

        Schema::create('migverify_seq', function (Blueprint $table): void {
            $table->id();
            $table->string('note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_seq');
    }
};
PHP
fixture "000002_migverify_f_purge_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Nothing to do; this target exists to be rolled back destructively.
    }

    public function down(): void
    {
        if (! Schema::hasTable('migverify_seq')) {
            return;
        }

        DB::table('migverify_seq')->whereNull('note')->delete();
    }
};
PHP
run_tool "F-target-created-table-seeded" 1 "destroyed|migverify_seq"

clear_fixtures

# G. down() rewrites a table to the same cardinality. Comparing counts alone reports
#    "destroyed no rows" while every original record is gone.
fixture "000001_migverify_g_setup_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Not a target: it puts rows in the table before the target's down() runs.
    public function up(): void
    {
        if (Schema::hasTable('migverify_swap')) {
            return;
        }

        Schema::create('migverify_swap', function (Blueprint $table): void {
            $table->id();
            $table->string('note')->nullable();
        });

        DB::table('migverify_swap')->insert([['note' => 'a'], ['note' => 'b'], ['note' => 'c']]);
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_swap');
    }
};
PHP
fixture "000002_migverify_g_target_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Deliberately names the table only inside raw SQL, so nothing but the raw-SQL
        // scan can put it in the pre-down snapshot.
    }

    public function down(): void
    {
        $n = (int) DB::selectOne('select count(*) as c from migverify_swap')->c;
        DB::statement('DELETE FROM migverify_swap');
        DB::statement("INSERT INTO migverify_swap (note) SELECT 'replaced-' || g FROM generate_series(1, $n) g");
    }
};
PHP
total=$((total + 1))
rc=0
bash "$TOOL" --seed-rows=3 --no-lock-probe --no-production-counts \
  --out-dir="$OUT_DIR/G" \
  "$MIGRATIONS_DIR/2099_01_01_000002_migverify_g_target_$$.php" > "$OUT_DIR/G.log" 2>&1 || rc=$?
rm -f $FIXTURE_GLOB
if [ "$rc" != "0" ] && grep -qF "migverify_swap" "$OUT_DIR/G.log" \
   && grep -qF "all replaced by different content" "$OUT_DIR/G.log"; then
  pass "G-row-identity-audited: exit $rc and the tool reported replaced content, not zero destruction"
else
  fail "G-row-identity-audited: exit $rc without the identity diagnostic (see $OUT_DIR/G.log)"
  grep -E "destroyed by down|rows |failures" "$OUT_DIR/G.log" | head -8 | sed 's/^/        /'
fi

# H. down() drops the table (and with it the trigger) but leaves the function behind.
#    A fingerprint without pg_proc/pg_trigger compares equal and calls that an exact
#    restore of the baseline.
clear_fixtures
fixture "000001_migverify_h_fn_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('migverify_fn_t')) {
            return;
        }

        DB::statement('create table migverify_fn_t (id bigserial primary key, v text)');
        DB::statement("create function migverify_fn() returns trigger language plpgsql as $$ begin return new; end $$");
        DB::statement('create trigger migverify_trg before insert on migverify_fn_t for each row execute function migverify_fn()');
    }

    public function down(): void
    {
        DB::statement('drop trigger if exists migverify_trg on migverify_fn_t');
        DB::statement('drop table if exists migverify_fn_t');
        // The function is deliberately left behind: that is the defect.
    }
};
PHP
run_tool "H-leftover-function-fails" 1 "down() did not restore the baseline schema|FUN||[8/8] Production impact"

# I. A table is created and then renamed, and a new column is filled with ''. The
#    rename must retire the old table expectation, and the fill report must not treat
#    an empty sample as "nothing was written".
clear_fixtures
fixture "000001_migverify_i_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('migverify_new')) {
            return;
        }

        if (! Schema::hasTable('migverify_old')) {
            Schema::create('migverify_old', function (Blueprint $table): void {
                $table->id();
                $table->string('note', 20)->nullable();
            });
        }

        Schema::rename('migverify_old', 'migverify_new');
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_new');
    }
};
PHP
run_tool "I-table-rename-passes" 0 "RESULT: PASS|table migverify_old absent|table migverify_new present"

# M. A column the migration adds and fills with '' on every existing row. The seeder
#    writes generated values into columns of rows it inserts, so the table has to exist
#    before the target runs for the empty-string case to be the only value present.
#    The report must not treat an empty sample as "nothing was written".
clear_fixtures
fixture "000001_migverify_m_setup_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Not a target: it gives the target a table with rows to backfill.
    public function up(): void
    {
        if (Schema::hasTable('migverify_blank')) {
            return;
        }

        Schema::create('migverify_blank', function (Blueprint $table): void {
            $table->id();
            $table->string('note')->nullable();
        });

        DB::table('migverify_blank')->insert([['note' => 'a'], ['note' => 'b']]);
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_blank');
    }
};
PHP
fixture "000002_migverify_m_target_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('migverify_blank') || Schema::hasColumn('migverify_blank', 'blank_col')) {
            return;
        }

        Schema::table('migverify_blank', function (Blueprint $table): void {
            // Fills every existing row with the empty string, which is the value an
            // empty sample cannot distinguish from "not populated".
            $table->string('blank_col', 20)->default('');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('migverify_blank') || ! Schema::hasColumn('migverify_blank', 'blank_col')) {
            return;
        }

        Schema::table('migverify_blank', function (Blueprint $table): void {
            $table->dropColumn('blank_col');
        });
    }
};
PHP
total=$((total + 1))
rc=0
bash "$TOOL" --seed-rows=3 --no-lock-probe --no-production-counts \
  --out-dir="$OUT_DIR/M" \
  "$MIGRATIONS_DIR/2099_01_01_000002_migverify_m_target_$$.php" > "$OUT_DIR/M.log" 2>&1 || rc=$?
rm -f $FIXTURE_GLOB
if [ "$rc" = "0" ] && grep -qF "migverify_blank.blank_col" "$OUT_DIR/M.log" \
   && grep -qF "values include: <empty>" "$OUT_DIR/M.log"; then
  pass "M-empty-string-fill-reported: exit 0 and the report says <empty>, not 'nothing written'"
else
  fail "M-empty-string-fill-reported: exit $rc (see $OUT_DIR/M.log)"
  grep -A6 "columns this migration filled" "$OUT_DIR/M.log" | head -8 | sed 's/^/        /'
fi

# S. down() drops a column and, in the same rollback, replaces every row at the same
#    count. Comparing only the columns common to both sides cannot see it, because both
#    readings would come from the already-rolled-back table; identity has to be captured
#    before the rollback, which is what the primary-key hash is for.
clear_fixtures
fixture "000001_migverify_s_setup_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Not a target: it gives the target a table with rows to replace.
    public function up(): void
    {
        if (Schema::hasTable('migverify_pk')) {
            return;
        }

        Schema::create('migverify_pk', function (Blueprint $table): void {
            $table->id();
            $table->string('note')->nullable();
        });

        DB::table('migverify_pk')->insert([['note' => 'a'], ['note' => 'b']]);
    }

    public function down(): void
    {
        Schema::dropIfExists('migverify_pk');
    }
};
PHP
fixture "000002_migverify_s_target_$$.php" <<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('migverify_pk') || Schema::hasColumn('migverify_pk', 'extra')) {
            return;
        }

        Schema::table('migverify_pk', function (Blueprint $table): void {
            $table->string('extra')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('migverify_pk')) {
            return;
        }

        $n = (int) DB::selectOne('select count(*) as c from migverify_pk')->c;
        DB::statement('DELETE FROM migverify_pk');
        DB::statement("INSERT INTO migverify_pk (note) SELECT 'swapped-' || g FROM generate_series(1, $n) g");

        if (Schema::hasColumn('migverify_pk', 'extra')) {
            Schema::table('migverify_pk', function (Blueprint $table): void {
                $table->dropColumn('extra');
            });
        }
    }
};
PHP
total=$((total + 1))
rc=0
bash "$TOOL" --seed-rows=3 --no-lock-probe --no-production-counts \
  --out-dir="$OUT_DIR/S" \
  "$MIGRATIONS_DIR/2099_01_01_000002_migverify_s_target_$$.php" > "$OUT_DIR/S.log" 2>&1 || rc=$?
rm -f $FIXTURE_GLOB
if [ "$rc" != "0" ] && grep -qF "all replaced by different content" "$OUT_DIR/S.log"; then
  pass "S-identity-across-column-drop: exit $rc and the replacement was caught despite the dropped column"
else
  fail "S-identity-across-column-drop: exit $rc without the identity diagnostic (see $OUT_DIR/S.log)"
  grep -E "destroyed by down|rows |table |failures" "$OUT_DIR/S.log" | head -8 | sed 's/^/        /'
fi

echo ""
if [ "$failures" -gt 0 ]; then
  echo "RESULT: FAIL ($failures of $total case(s))"
  exit 1
fi
echo "RESULT: PASS ($total control cases)"
