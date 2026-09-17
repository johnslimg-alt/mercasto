<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * EG-04 — stop account deletion from destroying the proof that consent was obtained.
 *
 * Before this migration `user_consents.user_id` was a `cascadeOnDelete()` foreign key,
 * so the hard `$user->delete()` in AccountDeletionController wiped the consent audit
 * trail while payments were deliberately retained. LFPDPPP requires the controller to
 * be able to *demonstrate* consent, so the evidence must outlive the account.
 *
 * Design (see engineering/eng8-data-rights-findings.md for the full rationale):
 *   1. `user_id` becomes nullable and the FK becomes `nullOnDelete()`. This is the
 *      structural safety net: no code path can cascade the proof away any more.
 *   2. `subject_ref` holds a keyed pseudonym (HMAC-SHA256 over the deleted user id,
 *      peppered with the application key). It is not reversible by enumeration the way
 *      a bare hash of a sequential id would be, and it is useless without the user id
 *      that the erasure just destroyed.
 *   3. `retention_basis` / `retained_at` / `retention_expires_at` document why the
 *      pseudonymised row is kept and when it must be purged.
 *
 * The rollback is intentionally lossy: rows whose `user_id` is already NULL cannot be
 * represented in the pre-migration schema (NOT NULL + cascade FK), so `down()` deletes
 * them. That is called out here because deleting consent evidence is exactly what this
 * migration exists to prevent - do not run `down()` on production without sign-off.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_consents')) {
            return;
        }

        $this->addRetentionColumns();
        $this->makeUserIdNullable();
        $this->replaceCascadeForeignKeyWithNullOnDelete();
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_consents')) {
            return;
        }

        // Cannot be represented in the old NOT NULL + cascade schema. Lossy by nature.
        DB::table('user_consents')
            ->whereNull('user_id')
            ->delete();

        $this->dropForeignKeyOnUserId();

        Schema::table('user_consents', function (Blueprint $table): void {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });

        Schema::table('user_consents', function (Blueprint $table): void {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        $columns = array_values(array_filter(
            ['subject_ref', 'retention_basis', 'retained_at', 'retention_expires_at'],
            static fn (string $column): bool => Schema::hasColumn('user_consents', $column),
        ));

        $this->dropRetentionColumns($columns);
    }

    /**
     * Indexes on the retention columns must go first, otherwise SQLite/Postgres leave a
     * dangling index behind after the column drop.
     *
     * @param  list<string>  $columns
     */
    private function dropRetentionColumns(array $columns): void
    {
        if ($columns === []) {
            return;
        }

        $lowered = array_map('strtolower', $columns);
        $indexNames = [];

        foreach (Schema::getIndexes('user_consents') as $index) {
            $indexColumns = array_map('strtolower', (array) ($index['columns'] ?? []));

            if (array_intersect($lowered, $indexColumns) !== [] && ! empty($index['name'])) {
                $indexNames[] = (string) $index['name'];
            }
        }

        foreach (array_unique($indexNames) as $name) {
            Schema::table('user_consents', function (Blueprint $table) use ($name): void {
                $table->dropIndex($name);
            });
        }

        Schema::table('user_consents', function (Blueprint $table) use ($columns): void {
            $table->dropColumn($columns);
        });
    }

    private function addRetentionColumns(): void
    {
        Schema::table('user_consents', function (Blueprint $table): void {
            if (! Schema::hasColumn('user_consents', 'subject_ref')) {
                // Keyed pseudonym of the erased subject. Never a direct identifier.
                $table->string('subject_ref', 64)->nullable()->after('user_id')->index();
            }

            if (! Schema::hasColumn('user_consents', 'retention_basis')) {
                $table->string('retention_basis', 64)->nullable()->after('user_agent_hash');
            }

            if (! Schema::hasColumn('user_consents', 'retained_at')) {
                $table->timestamp('retained_at')->nullable()->after('retention_basis');
            }

            if (! Schema::hasColumn('user_consents', 'retention_expires_at')) {
                $table->timestamp('retention_expires_at')->nullable()->after('retained_at')->index();
            }
        });
    }

    private function makeUserIdNullable(): void
    {
        Schema::table('user_consents', function (Blueprint $table): void {
            $table->unsignedBigInteger('user_id')->nullable()->change();
        });
    }

    private function replaceCascadeForeignKeyWithNullOnDelete(): void
    {
        $this->dropForeignKeyOnUserId();

        Schema::table('user_consents', function (Blueprint $table): void {
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Drop whatever FK currently guards `user_consents.user_id`.
     *
     * The drop is issued by *column list* rather than by constraint name on purpose.
     * SQLite cannot drop a foreign key in place: Laravel rebuilds the table from the
     * blueprint's recorded state, and `BlueprintState::update()` only removes a foreign
     * key when the dropped command's columns match it exactly. Dropping by name leaves
     * the old `cascade` constraint in the state, so the rebuild re-creates it and the
     * column ends up guarded by two contradictory foreign keys. Matching on the column
     * list is also what lets Postgres resolve the conventional constraint name.
     */
    private function dropForeignKeyOnUserId(): void
    {
        $columnSets = [];

        foreach (Schema::getForeignKeys('user_consents') as $foreignKey) {
            $columns = array_values(array_map(
                static fn (string $column): string => strtolower($column),
                (array) ($foreignKey['columns'] ?? []),
            ));

            if (in_array('user_id', $columns, true)) {
                $columnSets[implode(',', $columns)] = $columns;
            }
        }

        foreach ($columnSets as $columns) {
            Schema::table('user_consents', function (Blueprint $table) use ($columns): void {
                $table->dropForeign($columns);
            });
        }
    }
};
