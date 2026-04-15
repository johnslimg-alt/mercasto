<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            if (!Schema::hasColumn('ads', 'views')) {
                $table->unsignedInteger('views')->default(0)->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            if (Schema::hasColumn('ads', 'views')) {
                $table->dropColumn('views');
            }
        });
    }
};