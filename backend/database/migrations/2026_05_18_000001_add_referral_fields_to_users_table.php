<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'referral_code')) {
                $table->string('referral_code', 10)->unique()->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'referred_by')) {
                $table->unsignedBigInteger('referred_by')->nullable()->after('referral_code');
                $table->foreign('referred_by')->references('id')->on('users')->onDelete('set null');
            }
            if (!Schema::hasColumn('users', 'referral_credits')) {
                $table->integer('referral_credits')->default(0)->after('referred_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'referred_by')) {
                $table->dropForeign(['referred_by']);
            }
            $columns = array_values(array_filter(['referral_code', 'referred_by', 'referral_credits'], fn ($column) => Schema::hasColumn('users', $column)));
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
