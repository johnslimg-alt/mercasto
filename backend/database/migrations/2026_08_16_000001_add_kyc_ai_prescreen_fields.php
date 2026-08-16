<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('kyc_ai_status', 32)->nullable()->after('kyc_status');
            $table->text('kyc_ai_notes')->nullable()->after('kyc_ai_status');
            $table->timestamp('kyc_ai_checked_at')->nullable()->after('kyc_ai_notes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['kyc_ai_status', 'kyc_ai_notes', 'kyc_ai_checked_at']);
        });
    }
};
