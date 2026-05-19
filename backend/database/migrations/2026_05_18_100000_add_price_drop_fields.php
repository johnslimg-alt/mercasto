<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            if (!Schema::hasColumn('ads', 'price_dropped_at')) {
                $table->timestamp('price_dropped_at')->nullable();
            }
        });

        Schema::table('user_notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('user_notifications', 'type')) {
                $table->string('type', 50)->nullable();
            }
            if (!Schema::hasColumn('user_notifications', 'data')) {
                $table->jsonb('data')->nullable();
            }
            if (!Schema::hasColumn('user_notifications', 'link')) {
                $table->string('link', 500)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('ads', 'price_dropped_at')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->dropColumn('price_dropped_at');
            });
        }

        $notificationColumns = array_values(array_filter(['type', 'data', 'link'], fn ($column) => Schema::hasColumn('user_notifications', $column)));
        if ($notificationColumns !== []) {
            Schema::table('user_notifications', function (Blueprint $table) use ($notificationColumns) {
                $table->dropColumn($notificationColumns);
            });
        }
    }
};
