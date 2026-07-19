<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        $this->allowExpiredStatus($driver);

        if ($driver === 'pgsql') {
            DB::statement(<<<'SQL'
                UPDATE ads
                SET expires_at = LEAST(
                    COALESCE(expires_at, CURRENT_TIMESTAMP + INTERVAL '7 days'),
                    CURRENT_TIMESTAMP + INTERVAL '7 days'
                )
                WHERE status IN ('pending', 'archived', 'active', 'paused', 'inactive')
            SQL);
            DB::statement("ALTER TABLE ads ALTER COLUMN expires_at SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')");
        } elseif ($driver === 'mysql') {
            DB::statement(<<<'SQL'
                UPDATE ads
                SET expires_at = LEAST(
                    COALESCE(expires_at, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)),
                    DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 7 DAY)
                )
                WHERE status IN ('pending', 'archived', 'active', 'paused', 'inactive')
            SQL);
        } elseif ($driver === 'sqlite') {
            DB::statement(<<<'SQL'
                UPDATE ads
                SET expires_at = CASE
                    WHEN expires_at IS NULL OR expires_at > datetime('now', '+7 days')
                        THEN datetime('now', '+7 days')
                    ELSE expires_at
                END
                WHERE status IN ('pending', 'archived', 'active', 'paused', 'inactive')
            SQL);
        }

        $indexes = collect(Schema::getIndexes('ads'))->pluck('name');
        if (! $indexes->contains('ads_status_expires_at_index')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->index(['status', 'expires_at'], 'ads_status_expires_at_index');
            });
        }
    }

    public function down(): void
    {
        $indexes = collect(Schema::getIndexes('ads'))->pluck('name');
        if ($indexes->contains('ads_status_expires_at_index')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->dropIndex('ads_status_expires_at_index');
            });
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE ads ALTER COLUMN expires_at DROP DEFAULT');
        }
    }

    private function allowExpiredStatus(string $driver): void
    {
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_status_check');
            DB::statement(<<<'SQL'
                ALTER TABLE ads
                ADD CONSTRAINT ads_status_check
                CHECK (status IN ('active','inactive','archived','pending','rejected','draft','paused','expired'))
            SQL);

            return;
        }

        if ($driver === 'mysql') {
            DB::statement(<<<'SQL'
                ALTER TABLE ads
                MODIFY status ENUM('active','inactive','archived','pending','rejected','draft','paused','expired')
                NOT NULL DEFAULT 'active'
            SQL);

            return;
        }

        if ($driver === 'sqlite') {
            // Laravel represents enum columns as TEXT plus a CHECK constraint on SQLite.
            // Converting it to a string preserves every existing status and removes the
            // stale four-value CHECK constraint from the initial migration.
            Schema::table('ads', function (Blueprint $table) {
                $table->string('status')->default('active')->change();
            });
        }
    }
};
