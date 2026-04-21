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
        Schema::table('ads', function (Blueprint $table) {
            // Оптимизация Главной страницы и фильтрации: ускоряет WHERE status = 'active' AND category = '...' ORDER BY created_at
            $table->index(['status', 'category', 'created_at'], 'ads_feed_index');
            
            // Оптимизация Гео-поиска (Радиус/Города)
            $table->index(['latitude', 'longitude'], 'ads_geo_index');
        });

        Schema::table('ad_views', function (Blueprint $table) {
            // Оптимизация защиты от накрутки: ускоряет запросы в AdController::recordView
            $table->index(['ad_id', 'ip_address', 'created_at'], 'views_fraud_check_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $table->dropIndex('ads_feed_index');
            $table->dropIndex('ads_geo_index');
        });

        Schema::table('ad_views', function (Blueprint $table) {
            $table->dropIndex('views_fraud_check_index');
        });
    }
};