<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Таблица для сбора email'ов в waitlist
        Schema::create('waitlist_emails', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name')->nullable();
            $table->string('source')->nullable(); // Откуда пришел (landing, referral, etc)
            $table->boolean('invited')->default(false);
            $table->timestamp('invited_at')->nullable();
            $table->string('invited_by')->nullable();
            $table->text('notes')->nullable();
            $table->string('referral_code')->nullable()->unique();
            $table->integer('position')->default(0); // Позиция в очереди
            $table->timestamps();
            
            $table->index('invited');
            $table->index('position');
        });

        // Таблица для whitelist (приглашенные пользователи)
        Schema::create('invite_whitelist', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('invite_code')->unique();
            $table->boolean('used')->default(false);
            $table->foreignId('used_by_user_id')->nullable()->constrained('users');
            $table->timestamp('used_at')->nullable();
            $table->string('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index('used');
            $table->index('invite_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invite_whitelist');
        Schema::dropIfExists('waitlist_emails');
    }
};
