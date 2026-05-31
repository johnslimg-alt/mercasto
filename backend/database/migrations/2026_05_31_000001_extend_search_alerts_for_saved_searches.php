<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('search_alerts')) {
            return;
        }

        Schema::table('search_alerts', function (Blueprint $table) {
            if (!Schema::hasColumn('search_alerts', 'name')) {
                $table->string('name')->default('Búsqueda guardada')->after('user_id');
            }
            if (!Schema::hasColumn('search_alerts', 'category_slug')) {
                $table->string('category_slug')->nullable()->after('category_id');
            }
            if (!Schema::hasColumn('search_alerts', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (!Schema::hasColumn('search_alerts', 'last_notified_at')) {
                $table->timestamp('last_notified_at')->nullable()->after('is_active');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('search_alerts')) {
            return;
        }

        Schema::table('search_alerts', function (Blueprint $table) {
            if (Schema::hasColumn('search_alerts', 'last_notified_at')) {
                $table->dropColumn('last_notified_at');
            }
            if (Schema::hasColumn('search_alerts', 'state')) {
                $table->dropColumn('state');
            }
            if (Schema::hasColumn('search_alerts', 'category_slug')) {
                $table->dropColumn('category_slug');
            }
            if (Schema::hasColumn('search_alerts', 'name')) {
                $table->dropColumn('name');
            }
        });
    }
};
