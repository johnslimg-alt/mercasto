<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('ads', 'city')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->string('city', 100)->nullable()->after('state')->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('ads', 'city')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->dropColumn('city');
            });
        }
    }
};
