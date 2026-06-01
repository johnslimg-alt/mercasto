<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            if (! Schema::hasColumn('ads', 'boost_type')) {
                $table->string('boost_type')->nullable()->index()->after('promoted');
            }

            if (! Schema::hasColumn('ads', 'boost_expires_at')) {
                $table->timestamp('boost_expires_at')->nullable()->index()->after('boost_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            if (Schema::hasColumn('ads', 'boost_type')) {
                $table->dropColumn('boost_type');
            }

            if (Schema::hasColumn('ads', 'boost_expires_at')) {
                $table->dropColumn('boost_expires_at');
            }
        });
    }
};
