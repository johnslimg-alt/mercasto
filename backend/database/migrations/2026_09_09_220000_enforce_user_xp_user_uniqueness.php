<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_xp') || ! Schema::hasColumn('user_xp', 'user_id')) {
            return;
        }

        $hasUniqueUserIndex = collect(Schema::getIndexes('user_xp'))->contains(
            static function (array $index): bool {
                return ($index['unique'] ?? false) === true
                    && ($index['columns'] ?? []) === ['user_id'];
            }
        );

        if ($hasUniqueUserIndex) {
            return;
        }

        $hasDuplicates = DB::table('user_xp')
            ->select('user_id')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) > 1')
            ->exists();

        if ($hasDuplicates) {
            throw new RuntimeException(
                'Cannot enforce unique user_xp.user_id while duplicate gamification state rows exist.'
            );
        }

        DB::statement('CREATE UNIQUE INDEX user_xp_user_id_unique_runtime ON user_xp (user_id)');
    }

    public function down(): void
    {
        if (! Schema::hasTable('user_xp')) {
            return;
        }

        DB::statement('DROP INDEX IF EXISTS user_xp_user_id_unique_runtime');
    }
};
