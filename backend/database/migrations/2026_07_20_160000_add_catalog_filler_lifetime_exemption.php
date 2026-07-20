<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('ads', 'is_catalog_filler')) {
            Schema::table('ads', function (Blueprint $table) {
                $table->boolean('is_catalog_filler')
                    ->default(false)
                    ->index()
                    ->after('status');
            });
        }

        $catalogOwnerEmails = [
            'tienda_demo@mercasto.com',
            'seller@example.com',
            'johnnybroom@telegram.local',
            'ivanagente452@gmail.com',
            'reefmotorscom@gmail.com',
        ];

        $catalogOwnerIds = DB::table('users')
            ->whereIn('email', $catalogOwnerEmails)
            ->pluck('id');

        if ($catalogOwnerIds->isEmpty()) {
            return;
        }

        DB::table('ads')
            ->whereIn('user_id', $catalogOwnerIds)
            ->update([
                'is_catalog_filler' => true,
                'expires_at' => null,
                'reminder_sent_at' => null,
                'updated_at' => now(),
            ]);

        DB::table('ads')
            ->whereIn('user_id', $catalogOwnerIds)
            ->whereIn('status', ['active', 'expired', 'paused', 'inactive'])
            ->update([
                'status' => 'active',
                'expires_at' => null,
                'reminder_sent_at' => null,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        if (! Schema::hasColumn('ads', 'is_catalog_filler')) {
            return;
        }

        DB::table('ads')
            ->where('is_catalog_filler', true)
            ->where('status', 'active')
            ->update([
                'expires_at' => now()->addDays((int) config('marketplace.ad_lifetime_days', 7)),
                'updated_at' => now(),
            ]);

        Schema::table('ads', function (Blueprint $table) {
            $table->dropIndex(['is_catalog_filler']);
            $table->dropColumn('is_catalog_filler');
        });
    }
};
