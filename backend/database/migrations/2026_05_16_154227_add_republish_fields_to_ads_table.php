<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            if (!Schema::hasColumn('ads', 'republished_at')) {
                $table->timestamp('republished_at')->nullable()->after('expires_at');
            }
            if (!Schema::hasColumn('ads', 'republish_count')) {
                $table->integer('republish_count')->default(0)->after('republished_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $table->dropColumn(['republished_at', 'republish_count']);
        });
    }
};
