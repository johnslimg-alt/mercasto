<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('ad_id')->nullable()->constrained('ads')->onDelete('set null')->after('user_id');
        });

        Schema::table('ads', function (Blueprint $table) {
            $table->string('promoted')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['ad_id']);
            $table->dropColumn('ad_id');
        });
        Schema::table('ads', function (Blueprint $table) {
            $table->dropColumn('promoted');
        });
    }
};