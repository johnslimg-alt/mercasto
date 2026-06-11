<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banner_impressions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('banner_id')->constrained('ad_banners')->onDelete('cascade');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('placement_slug')->nullable();
            $table->string('category_slug')->nullable();
            $table->string('state')->nullable();
            $table->boolean('clicked')->default(false);
            $table->string('user_agent')->nullable();
            $table->timestamps();

            $table->index(['banner_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['ip_address', 'created_at']);
            $table->index(['placement_slug', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banner_impressions');
    }
};
