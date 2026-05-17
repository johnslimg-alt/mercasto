<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('ads', 'state')) {
            return;
        }

        Schema::table('ads', function (Blueprint $table) {
            $table->string('state', 60)->nullable()->after('location');
            $table->index('state', 'ads_state_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('ads', 'state')) {
            return;
        }

        Schema::table('ads', function (Blueprint $table) {
            $table->dropIndex('ads_state_index');
            $table->dropColumn('state');
        });
    }
};
