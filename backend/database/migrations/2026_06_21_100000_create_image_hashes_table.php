<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('image_hashes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->nullable()->constrained('ads')->cascadeOnDelete();
            $table->string('image_path', 500)->nullable();
            $table->string('phash', 16);
            $table->timestamps();
            $table->index('phash');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('image_hashes');
    }
};
