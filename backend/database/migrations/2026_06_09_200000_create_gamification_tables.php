<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('achievements', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('name_en');
            $table->string('name_es');
            $table->string('name_pt');
            $table->text('description_en');
            $table->text('description_es');
            $table->text('description_pt');
            $table->string('icon');
            $table->string('category');
            $table->integer('xp_reward')->default(0);
            $table->integer('requirement')->default(1);
            $table->string('requirement_type');
            $table->boolean('is_secret')->default(false);
            $table->integer('rarity')->default(1);
            $table->timestamps();
        });

        Schema::create('user_achievements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('achievement_id')->constrained()->onDelete('cascade');
            $table->integer('progress')->default(0);
            $table->boolean('unlocked')->default(false);
            $table->timestamp('unlocked_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'achievement_id']);
        });

        Schema::create('user_xp', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->unique();
            $table->integer('total_xp')->default(0);
            $table->integer('level')->default(1);
            $table->integer('current_streak')->default(0);
            $table->integer('longest_streak')->default(0);
            $table->date('last_activity_date')->nullable();
            $table->timestamp('last_xp_gain_at')->nullable();
            $table->timestamps();
        });

        Schema::create('xp_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->integer('amount');
            $table->string('reason');
            $table->string('reference_type')->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('activity_streaks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('activity_date');
            $table->string('activity_type')->default('login');
            $table->timestamps();
            $table->unique(['user_id', 'activity_date', 'activity_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_streaks');
        Schema::dropIfExists('xp_transactions');
        Schema::dropIfExists('user_xp');
        Schema::dropIfExists('user_achievements');
        Schema::dropIfExists('achievements');
    }
};
