<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('referrals')) {
            return;
        }

        Schema::create('referrals', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('referrer_id');
            $table->unsignedBigInteger('referred_id');
            $table->timestampTz('reward_given_at')->nullable();
            $table->timestampTz('created_at')->nullable()->useCurrent();

            $table->unique('referred_id', 'referrals_referred_id_key');
            $table->foreign('referrer_id', 'referrals_referrer_id_fkey')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('referred_id', 'referrals_referred_id_fkey')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Adoption migration: production may have pre-existing referral data.
        // Deliberately do not drop the table on rollback.
    }
};
