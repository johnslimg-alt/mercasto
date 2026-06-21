<?php
// Migration: create contact_clicks table
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('contact_clicks')) {
            Schema::create('contact_clicks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('ad_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
                $table->string('channel', 20); // whatsapp, telegram, email, phone
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamps();
                
                $table->index(['ad_id', 'created_at']);
                $table->index(['user_id', 'created_at']);
                $table->index('channel');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_clicks');
    }
};
