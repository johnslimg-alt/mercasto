<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_searches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->json('filters'); // {query, category, state, city, min_price, max_price, etc.}
            $table->boolean('alerts_enabled')->default(true);
            $table->timestamp('last_checked_at')->nullable();
            $table->integer('new_results_count')->default(0);
            $table->timestamps();
            
            $table->index(['user_id', 'alerts_enabled']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_searches');
    }
};
