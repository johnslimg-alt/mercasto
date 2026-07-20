<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $renames = [
            'seller@example.com' => 'Mercasto Selección',
            'admin@mercasto.com' => 'Equipo Mercasto',
            'seller_e2e@mercasto.com' => 'Mercasto Control',
            'admin_e2e@mercasto.com' => 'Equipo Técnico Mercasto',
        ];

        foreach ($renames as $email => $name) {
            DB::table('users')
                ->where('email', $email)
                ->update([
                    'name' => $name,
                    'updated_at' => now(),
                ]);
        }

        DB::table('users')
            ->whereRaw("LOWER(COALESCE(name, '')) LIKE '%demo%'")
            ->whereNotIn('email', array_keys($renames))
            ->update([
                'name' => 'Usuario Mercasto',
                'updated_at' => now(),
            ]);

        DB::table('users')
            ->whereRaw("LOWER(COALESCE(business_name, '')) LIKE '%demo%'")
            ->update([
                'business_name' => 'Mercasto Selección',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        $renames = [
            'seller@example.com' => 'Seller Demo',
            'admin@mercasto.com' => 'Admin Demo',
            'seller_e2e@mercasto.com' => 'E2E Seller',
            'admin_e2e@mercasto.com' => 'E2E Admin',
        ];

        foreach ($renames as $email => $name) {
            DB::table('users')
                ->where('email', $email)
                ->update([
                    'name' => $name,
                    'updated_at' => now(),
                ]);
        }
    }
};
