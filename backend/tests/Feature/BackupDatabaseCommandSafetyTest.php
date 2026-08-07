<?php

namespace Tests\Feature;

use Tests\TestCase;

class BackupDatabaseCommandSafetyTest extends TestCase
{
    public function test_manual_backup_fails_closed_without_database_password(): void
    {
        config(['database.connections.pgsql.password' => null]);

        $this->artisan('db:backup')
            ->expectsOutputToContain('Database password is not configured')
            ->assertFailed();
    }
}
