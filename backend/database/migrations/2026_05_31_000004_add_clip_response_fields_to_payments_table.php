<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('clip_payment_request_id')->nullable()->index()->after('clip_checkout_id');
            $table->string('clip_payment_request_url')->nullable()->after('clip_payment_request_id');
            $table->json('clip_checkout_response')->nullable()->after('webhook_payload');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'clip_payment_request_id',
                'clip_payment_request_url',
                'clip_checkout_response',
            ]);
        });
    }
};
