<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Drop existing check constraint (name may vary — drop both common names)
        DB::statement("ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_status_check");

        // Re-add with full set of valid statuses including paused and expired
        DB::statement("
            ALTER TABLE ads
            ADD CONSTRAINT ads_status_check
            CHECK (status IN ('active','inactive','archived','pending','rejected','draft','paused','expired'))
        ");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE ads DROP CONSTRAINT IF EXISTS ads_status_check");

        DB::statement("
            ALTER TABLE ads
            ADD CONSTRAINT ads_status_check
            CHECK (status IN ('active','inactive','archived','pending','rejected','draft'))
        ");
    }
};
