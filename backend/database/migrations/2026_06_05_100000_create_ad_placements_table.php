<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_placements', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // header_top, sidebar, footer, feed_between, search_results, category_page
            $table->string('name'); // Отображаемое название
            $table->text('description')->nullable();
            $table->string('position'); // header, sidebar, footer, feed, between, search, category
            $table->integer('width')->default(728);
            $table->integer('height')->default(90);
            $table->integer('max_banners')->default(3); // Макс. баннеров одновременно
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['position', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_placements');
    }
};
