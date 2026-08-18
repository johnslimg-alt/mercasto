<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ReportLifecycleMigrationContractTest extends TestCase
{
    public function test_lifecycle_migration_tolerates_pre_existing_production_columns(): void
    {
        $path = __DIR__ . '/../../database/migrations/2026_08_18_110000_add_lifecycle_to_report_tables.php';
        $source = file_get_contents($path);

        $this->assertIsString($source);
        $this->assertStringContainsString("Schema::hasTable(\$tableName)", $source);
        $this->assertStringContainsString("Schema::hasColumn(\$tableName, \$column)", $source);

        foreach ([
            'status',
            'review_started_at',
            'resolved_at',
            'resolved_by',
            'resolution_action',
            'resolution_note',
        ] as $column) {
            $this->assertStringContainsString("addIfMissing(\$tableName, '{$column}'", $source);
        }

        $this->assertStringNotContainsString('dropColumn(', $source);
        $this->assertStringNotContainsString('dropConstrainedForeignId(', $source);
    }
}