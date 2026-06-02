<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('price_history')) {
            return;
        }

        Schema::create('price_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ad_id');
            $table->decimal('old_price', 12, 2);
            $table->decimal('new_price', 12, 2);
            $table->timestamp('changed_at')->useCurrent();

            $table->foreign('ad_id')
                ->references('id')
                ->on('ads')
                ->onDelete('cascade');

            $table->index(['ad_id', 'changed_at'], 'idx_price_history_ad');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_history');
    }
};