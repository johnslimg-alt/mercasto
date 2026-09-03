<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'phone_otp_hash')) {
                $table->string('phone_otp_hash', 64)->nullable()->after('phone_otp');
            }
        });

        // Legacy six-digit OTPs were stored in plaintext. They are intentionally
        // invalidated during rollout rather than copied or transformed: the code
        // space is too small to make an offline-verifiable legacy representation safe.
        if (Schema::hasColumn('users', 'phone_otp')) {
            DB::table('users')->whereNotNull('phone_otp')->update([
                'phone_otp' => null,
                'phone_otp_expires_at' => null,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'phone_otp_hash')) {
                $table->dropColumn('phone_otp_hash');
            }
        });
    }
};
