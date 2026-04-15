<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'apple_id')) {
                $table->string('apple_id')->nullable()->unique()->after('google_id');
            }
            if (!Schema::hasColumn('users', 'telegram_id')) {
                $table->string('telegram_id')->nullable()->unique()->after('apple_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['apple_id', 'telegram_id']);
        });
    }
};