<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_trackings', function (Blueprint $table) {
            $table->id();
            $table->string('email_type');
            $table->string('recipient_email');
            $table->foreignId('recipient_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('event');
            $table->string('tracking_id')->unique();
            $table->string('link_url')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('language', 5)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['email_type', 'event']);
            $table->index('recipient_email');
            $table->index('tracking_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_trackings');
    }
};
