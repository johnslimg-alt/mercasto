<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 32)->unique();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name', 100);
            $table->string('email', 190)->index();
            $table->string('subject', 80);
            $table->text('message');
            $table->string('queue', 32)->default('support')->index();
            $table->string('status', 32)->default('received')->index();
            $table->string('ip_hash', 64)->nullable();
            $table->timestamps();

            $table->index(['queue', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_requests');
    }
};
