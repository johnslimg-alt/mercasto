<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ads table — fill gaps left by existing ads_feed_index (status,category,created_at)
        Schema::table('ads', function (Blueprint $table) {
            // user_id — for "my ads" / seller profile queries
            $table->index('user_id', 'idx_ads_user_id');

            // status standalone — WHERE status='active' without category filter
            $table->index('status', 'idx_ads_status');

            // location — for city-based search / filtering
            $table->index('location', 'idx_ads_location');

            // status + location composite — common filter: active ads in a city
            $table->index(['status', 'location'], 'idx_ads_status_location');

            // promoted + created_at — for featured/boosted ad listings
            $table->index(['promoted', 'created_at'], 'idx_ads_promoted_created');
        });

        // reviews — standalone seller_id for profile review lookups
        Schema::table('reviews', function (Blueprint $table) {
            $table->index('seller_id', 'idx_reviews_seller_id');
        });
    }

    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $table->dropIndex('idx_ads_user_id');
            $table->dropIndex('idx_ads_status');
            $table->dropIndex('idx_ads_location');
            $table->dropIndex('idx_ads_status_location');
            $table->dropIndex('idx_ads_promoted_created');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex('idx_reviews_seller_id');
        });
    }
};
