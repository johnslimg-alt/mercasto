<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('ads', 'subcategory')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->string('subcategory')->nullable()->after('category');
                $table->index('subcategory');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('ads', 'subcategory')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->dropIndex(['subcategory']);
                $table->dropColumn('subcategory');
            });
        }
    }
};
