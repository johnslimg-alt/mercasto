<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ad_clicks', function (Blueprint $table) {
            $table->id();
            // References the ads table and automatically drops clicks if the ad is deleted
            $table->foreignId('ad_id')->constrained('ads')->onDelete('cascade');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('channel')->default('whatsapp');
            $table->string('ip_address')->nullable();
            $table->timestamps();
            
            $table->index(['ad_id', 'channel']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_clicks');
    }
};