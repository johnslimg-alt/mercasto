<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ (С ролями, балансом и WhatsApp)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            
            // Новые поля для бизнес-модели
            $table->enum('role', ['individual', 'business', 'admin'])->default('individual');
            $table->decimal('balance', 10, 2)->default(0.00);
            $table->string('whatsapp')->nullable();
            
            // Поля для бизнес-аккаунтов (PRO)
            $table->string('company_name')->nullable();
            $table->string('company_logo')->nullable();
            $table->boolean('is_verified')->default(false);

            $table->rememberToken();
            $table->timestamps();
        });

        // Служебные таблицы Laravel
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // 2. ТАБЛИЦА ОБЪЯВЛЕНИЙ
        Schema::create('ads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2);
            $table->decimal('old_price', 12, 2)->nullable();
            $table->string('location')->nullable();
            $table->string('category');
            $table->string('image_url')->nullable();
            $table->enum('status', ['pending', 'active', 'rejected', 'archived'])->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // 3. ТАБЛИЦА ПРОДВИЖЕНИЯ (Услуги)
        Schema::create('ad_promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained()->onDelete('cascade');
            $table->enum('type', ['vip', 'highlight', 'lift']);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // 4. ТАБЛИЦА АНАЛИТИКИ (Клики в мессенджеры)
        Schema::create('ad_clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ad_id')->constrained()->onDelete('cascade');
            $table->enum('channel', ['whatsapp', 'telegram', 'phone']);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ad_clicks');
        Schema::dropIfExists('ad_promotions');
        Schema::dropIfExists('ads');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
