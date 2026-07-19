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
};
