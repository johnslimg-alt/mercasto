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
        if (Schema::hasTable('ad_views')) {
            Schema::table('ad_views', function (Blueprint $table) {
                if (!Schema::hasColumn('ad_views', 'user_agent')) {
                    $table->text('user_agent')->nullable();
                }
                if (!Schema::hasColumn('ad_views', 'viewed_at')) {
                    $table->timestamp('viewed_at')->nullable();
                }
                // Safely add indexes
                try {
                    $table->index(['user_id', 'viewed_at']);
                    $table->index(['ad_id', 'viewed_at']);
                    $table->index(['user_id', 'ad_id', 'viewed_at']);
                } catch (\Exception $e) {
                    // Indexes might already exist
                }
            });
            return;
        }

        Schema::create('ad_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained('ads')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('viewed_at');
            $table->timestamps();

            // Indexes for performance
            $table->index(['user_id', 'viewed_at']);
            $table->index(['ad_id', 'viewed_at']);
            $table->index(['user_id', 'ad_id', 'viewed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_views');
    }
};
