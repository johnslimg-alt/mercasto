<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('plan_code')->default('package_free')->index()->after('role');
            $table->string('plan_name')->default('Plan Gratis')->after('plan_code');
            $table->unsignedInteger('monthly_ad_limit')->default(3)->after('plan_name');
            $table->timestamp('plan_expires_at')->nullable()->index()->after('monthly_ad_limit');
            $table->timestamp('plan_activated_at')->nullable()->after('plan_expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'plan_code',
                'plan_name',
                'monthly_ad_limit',
                'plan_expires_at',
                'plan_activated_at',
            ]);
        });
    }
};
