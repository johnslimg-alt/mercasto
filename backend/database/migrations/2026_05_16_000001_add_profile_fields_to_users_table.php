<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'bio')) {
                $table->text('bio')->nullable()->after('avatar_url');
            }
            if (!Schema::hasColumn('users', 'city')) {
                $table->string('city', 100)->nullable()->after('bio');
            }
            if (!Schema::hasColumn('users', 'website')) {
                $table->string('website')->nullable()->after('whatsapp');
            }
            if (!Schema::hasColumn('users', 'social_instagram')) {
                $table->string('social_instagram', 100)->nullable()->after('website');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            foreach (['bio', 'city', 'website', 'social_instagram'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
