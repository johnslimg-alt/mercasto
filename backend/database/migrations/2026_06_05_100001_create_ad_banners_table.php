<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_banners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('placement_id')->constrained('ad_placements')->onDelete('cascade');
            $table->string('title');
            $table->string('image_url');
            $table->string('link_url')->nullable();
            $table->string('alt_text')->nullable();
            $table->text('description')->nullable();
            $table->integer('priority')->default(0); // Выше = показывается раньше
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->json('target_categories')->nullable(); // Массив категорий для таргетинга
            $table->json('target_states')->nullable(); // Массив штатов для таргетинга
            $table->json('target_user_types')->nullable(); // ['all', 'logged_in', 'guest', 'premium']
            $table->unsignedBigInteger('impressions_count')->default(0);
            $table->unsignedBigInteger('clicks_count')->default(0);
            $table->decimal('ctr', 5, 2)->default(0); // Click-through rate %
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['placement_id', 'is_active', 'priority']);
            $table->index(['starts_at', 'ends_at', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_banners');
    }
};
