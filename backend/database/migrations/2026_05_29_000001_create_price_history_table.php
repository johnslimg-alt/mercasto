<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotente: en producción la tabla ya existe (creada por la versión anterior
        // de esta migración con SQL crudo de Postgres). Schema builder mantiene la
        // compatibilidad con sqlite para el gate de PHPUnit.
        if (Schema::hasTable('price_history')) {
            return;
        }

        Schema::create('price_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained('ads')->cascadeOnDelete();
            $table->decimal('old_price', 12, 2);
            $table->decimal('new_price', 12, 2);
            $table->timestampTz('changed_at')->useCurrent();

            $table->index(['ad_id', 'changed_at'], 'idx_price_history_ad');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('price_history');
    }
};
