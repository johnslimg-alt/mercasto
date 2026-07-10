<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_achievements', function (Blueprint $table) {
            if (! Schema::hasColumn('user_achievements', 'unlocked')) {
                $table->boolean('unlocked')->default(false)->after('achievement_id');
            }
            if (! Schema::hasColumn('user_achievements', 'progress')) {
                $table->integer('progress')->default(0)->after('unlocked');
            }
        });

        // Backfill: any row that already has unlocked_at set was in fact unlocked.
        Schema::table('user_achievements', function (Blueprint $table) {
            //
        });
        \Illuminate\Support\Facades\DB::table('user_achievements')
            ->whereNotNull('unlocked_at')
            ->update(['unlocked' => true]);
    }

    public function down(): void
    {
        Schema::table('user_achievements', function (Blueprint $table) {
            $table->dropColumn(['unlocked', 'progress']);
        });
    }
};
