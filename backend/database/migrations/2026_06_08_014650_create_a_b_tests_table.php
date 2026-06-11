<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('a_b_tests', function (Blueprint $table) {
            $table->id();
            $table->string('test_name');
            $table->string('variant');
            $table->text('variant_content')->nullable();
            $table->unsignedBigInteger('views')->default(0);
            $table->unsignedBigInteger('conversions')->default(0);
            $table->decimal('conversion_rate', 5, 2)->default(0);
            $table->enum('status', ['active', 'paused', 'winner', 'loser'])->default('active');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
            $table->index(['test_name', 'status']);
            $table->unique(['test_name', 'variant']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('a_b_tests');
    }
};
