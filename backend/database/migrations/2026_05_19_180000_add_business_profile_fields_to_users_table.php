<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('business_name')->nullable()->after('company_name');
            $table->string('business_rfc', 13)->nullable()->after('business_name');
            $table->string('business_logo_url')->nullable()->after('business_rfc');
            $table->string('business_website')->nullable()->after('business_logo_url');
            $table->string('business_phone')->nullable()->after('business_website');
            $table->string('business_whatsapp')->nullable()->after('business_phone');
            $table->json('business_hours')->nullable()->after('business_whatsapp');
            $table->string('business_address')->nullable()->after('business_hours');
            $table->text('business_description')->nullable()->after('business_address');
            $table->boolean('business_profile_enabled')->default(false)->after('business_description');
            $table->timestamp('business_rfc_verified_at')->nullable()->after('business_profile_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'business_name',
                'business_rfc',
                'business_logo_url',
                'business_website',
                'business_phone',
                'business_whatsapp',
                'business_hours',
                'business_address',
                'business_description',
                'business_profile_enabled',
                'business_rfc_verified_at',
            ]);
        });
    }
};
