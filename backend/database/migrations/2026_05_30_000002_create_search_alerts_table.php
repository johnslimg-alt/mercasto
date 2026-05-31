<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('search_alerts')) {
            Schema::create('search_alerts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->string('query')->nullable();
                $table->foreignId('category_id')->nullable()->constrained()->onDelete('set null');
                $table->string('category_slug')->nullable();
                $table->decimal('min_price', 12, 2)->nullable();
                $table->decimal('max_price', 12, 2)->nullable();
                $table->string('city')->nullable();
                $table->string('state')->nullable();
                $table->json('filters')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamp('last_notified_at')->nullable();
                $table->timestamps();

                // Index for querying active alerts for weekly digest
                $table->index(['user_id', 'is_active']);
                $table->index(['category_slug', 'is_active']);
            });
            return;
        }

        Schema::table('search_alerts', function (Blueprint $table) {
            if (!Schema::hasColumn('search_alerts', 'query')) {
                $table->string('query')->nullable()->after('name');
            }
            if (!Schema::hasColumn('search_alerts', 'category_slug')) {
                $table->string('category_slug')->nullable()->after('category_id');
            }
            if (!Schema::hasColumn('search_alerts', 'state')) {
                $table->string('state')->nullable()->after('city');
            }
            if (!Schema::hasColumn('search_alerts', 'filters')) {
                $table->json('filters')->nullable()->after('state');
            }
            if (!Schema::hasColumn('search_alerts', 'last_notified_at')) {
                $table->timestamp('last_notified_at')->nullable()->after('is_active');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('search_alerts');
    }
};
