<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * EG-04 — the consent-proof migration must be reversible, and its whole point is the
 * foreign key: `user_consents.user_id` must stop cascading on user deletion.
 *
 * This test owns the schema lifecycle itself (no RefreshDatabase) so it can migrate,
 * roll back and migrate again in an isolated in-memory SQLite database.
 */
class ConsentProofMigrationTest extends TestCase
{
    public function test_migration_swaps_the_cascade_foreign_key_for_retention_columns(): void
    {
        $this->artisan('migrate:fresh')->assertSuccessful();

        // up(): retention columns exist.
        foreach (['subject_ref', 'retention_basis', 'retained_at', 'retention_expires_at'] as $column) {
            $this->assertTrue(
                Schema::hasColumn('user_consents', $column),
                "user_consents.{$column} is missing after up()",
            );
        }

        // up(): user_id is nullable so a pseudonymised row can outlive the account.
        $this->assertFalse(
            $this->columnIsNotNull('user_consents', 'user_id'),
            'user_consents.user_id must be nullable after up()',
        );

        // up(): deleting a user must no longer take the consent proof with it.
        $onDelete = $this->foreignKeyOnDelete('user_consents', 'user_id');
        $this->assertNotSame('cascade', $onDelete, 'user_consents.user_id still cascades on delete');
        $this->assertSame('set null', $onDelete);

        // down(): schema returns to its pre-migration shape.
        $this->artisan('migrate:rollback', ['--step' => 1])->assertSuccessful();

        foreach (['subject_ref', 'retention_basis', 'retained_at', 'retention_expires_at'] as $column) {
            $this->assertFalse(
                Schema::hasColumn('user_consents', $column),
                "user_consents.{$column} survived down()",
            );
        }

        $this->assertSame('cascade', $this->foreignKeyOnDelete('user_consents', 'user_id'));
        $this->assertDatabaseCount('user_consents', 0);

        // Re-applying restores the fixed schema, so a rollback is not a one-way door.
        $this->artisan('migrate')->assertSuccessful();
        $this->assertTrue(Schema::hasColumn('user_consents', 'subject_ref'));
        $this->assertSame('set null', $this->foreignKeyOnDelete('user_consents', 'user_id'));
    }

    private function foreignKeyOnDelete(string $table, string $column): ?string
    {
        foreach (Schema::getForeignKeys($table) as $foreignKey) {
            $columns = array_map('strtolower', (array) ($foreignKey['columns'] ?? []));

            if (in_array(strtolower($column), $columns, true)) {
                return strtolower((string) ($foreignKey['on_delete'] ?? ''));
            }
        }

        return null;
    }

    private function columnIsNotNull(string $table, string $column): bool
    {
        foreach (Schema::getColumns($table) as $definition) {
            if (strtolower((string) ($definition['name'] ?? '')) === strtolower($column)) {
                return (bool) ($definition['nullable'] ?? false) === false;
            }
        }

        return true;
    }
}
