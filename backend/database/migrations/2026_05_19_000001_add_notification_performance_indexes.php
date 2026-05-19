<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX IF NOT EXISTS idx_favorites_ad_user ON favorites (ad_id, user_id)');
        DB::statement('CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read_created ON user_notifications (user_id, is_read, created_at DESC)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_user_notifications_user_read_created');
        DB::statement('DROP INDEX IF EXISTS idx_favorites_ad_user');
    }
};
