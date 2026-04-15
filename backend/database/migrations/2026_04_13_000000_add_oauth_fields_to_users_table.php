<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Разрешаем паролю быть null для пользователей, вошедших через OAuth
            $table->string('password')->nullable()->change();
            
            // Поля для OAuth
            $table->string('google_id')->nullable()->unique();
            $table->string('telegram_id')->nullable()->unique();
            $table->string('telegram_username')->nullable();
            
            // Аватарка (может отличаться от логотипа компании)
            $table->string('avatar_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable(false)->change();
            $table->dropColumn(['google_id', 'telegram_id', 'telegram_username', 'avatar_path']);
        });
    }
};
