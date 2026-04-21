<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            // Columna JSON para almacenar los 600+ parámetros dinámicos sin alterar el esquema
            $table->json('attributes')->nullable()->after('category');
            $table->index('price');
            $table->index('condition');
        });
    }

    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $table->dropColumn('attributes');
            $table->dropIndex(['price']);
            $table->dropIndex(['condition']);
        });
    }
};