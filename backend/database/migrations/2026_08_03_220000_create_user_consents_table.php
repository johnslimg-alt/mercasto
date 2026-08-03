<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('user_consents')) {
            return;
        }

        Schema::create('user_consents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('consent_type', 40);
            $table->string('document_version', 64);
            $table->timestamp('accepted_at');
            $table->timestamp('client_accepted_at')->nullable();
            $table->string('source', 20)->default('api');
            $table->string('ip_hash', 64)->nullable();
            $table->string('user_agent_hash', 64)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'consent_type']);
            $table->index(['consent_type', 'document_version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_consents');
    }
};
