<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Назначаем роль admin для аккаунта johnslimg@gmail.com (по запросу владельца).
     */
    public function up(): void
    {
        DB::table('users')
            ->where('email', 'johnslimg@gmail.com')
            ->update(['role' => 'admin', 'updated_at' => now()]);
    }

    /**
     * Откат: возвращаем обычную роль individual.
     */
    public function down(): void
    {
        DB::table('users')
            ->where('email', 'johnslimg@gmail.com')
            ->update(['role' => 'individual', 'updated_at' => now()]);
    }
};
