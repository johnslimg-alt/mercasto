<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payment_products')) {
            return;
        }

        Schema::create('payment_products', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->decimal('price', 10, 2);
            $table->text('description')->nullable();
            $table->string('type')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Adoption migration: production already owns this table and seeded rows.
        // Deliberately do not drop it on rollback.
    }
};
