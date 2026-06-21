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
        Schema::table('users', function (Blueprint $table) {
            $table->string('preferred_role', 20)->nullable()->after('role');
            $table->json('preferred_categories')->nullable()->after('preferred_role');
            $table->timestamp('onboarding_completed_at')->nullable()->after('preferred_categories');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['preferred_role', 'preferred_categories', 'onboarding_completed_at']);
        });
    }
};
