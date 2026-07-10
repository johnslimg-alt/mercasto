<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('business_csf_url')->nullable()->after('business_rfc_verified_at');
            // pending | ai_verified | ai_flagged | admin_verified | rejected
            $table->string('business_rfc_status', 20)->default('pending')->after('business_csf_url');
            $table->text('business_rfc_ai_notes')->nullable()->after('business_rfc_status');
            $table->timestamp('business_rfc_checked_at')->nullable()->after('business_rfc_ai_notes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'business_csf_url',
                'business_rfc_status',
                'business_rfc_ai_notes',
                'business_rfc_checked_at',
            ]);
        });
    }
};
