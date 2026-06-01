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
        if (Schema::hasColumn('users', 'business_banner_url')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('business_banner_url')->nullable()->after('business_logo_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasColumn('users', 'business_banner_url')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('business_banner_url');
        });
    }
};
