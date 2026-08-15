<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'first_return_after_24h_at')) {
                $table->timestamp('first_return_after_24h_at')->nullable()->index()->after('last_active_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'first_return_after_24h_at')) {
                $table->dropColumn('first_return_after_24h_at');
            }
        });
    }
};
