<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->integer('credits');
            $table->integer('max_uses')->default(1);
            $table->integer('used_count')->default(0);
            $table->timestamps();
        });

        Schema::create('coupon_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('coupon_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            $table->unique(['user_id', 'coupon_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_user');
        Schema::dropIfExists('coupons');
    }
};