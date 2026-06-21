<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('waitlist_emails', function (Blueprint $table) {
            $table->boolean('email_sent')->default(false)->after('referral_code');
            $table->timestamp('email_sent_at')->nullable()->after('email_sent');
            $table->index(['created_at', 'email_sent']);
        });
    }

    public function down()
    {
        Schema::table('waitlist_emails', function (Blueprint $table) {
            $table->dropColumn(['email_sent', 'email_sent_at']);
        });
    }
};
