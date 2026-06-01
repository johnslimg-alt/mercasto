<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('payments', 'product_code')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->string('product_code')->nullable()->index()->after('description');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('payments', 'product_code')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropColumn('product_code');
            });
        }
    }
};
