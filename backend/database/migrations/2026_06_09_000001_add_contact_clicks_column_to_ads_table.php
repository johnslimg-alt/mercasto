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
        Schema::table('ads', function (Blueprint $table) {
            $table->unsignedInteger('contact_clicks')->default(0)->after('click_count')->comment('Количество кликов по кнопкам контактов (WhatsApp, Telegram, Email, Phone)');
            $table->index('contact_clicks');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $table->dropIndex(['contact_clicks']);
            $table->dropColumn('contact_clicks');
        });
    }
};
