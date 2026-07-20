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
