<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_violations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 50);
            $table->text('details')->nullable();
            $table->string('ip_address', 45)->nullable()->index();
            $table->string('email')->nullable()->index();
            $table->string('phone', 30)->nullable()->index();
            $table->string('device_fingerprint', 100)->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_violations');
    }
};
