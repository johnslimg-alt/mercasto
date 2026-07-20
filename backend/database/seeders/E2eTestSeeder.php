<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class E2eTestSeeder extends Seeder
{
    /**
     * Seed the application's E2E test users.
     */
    public function run(): void
    {
        $sellerEmail = env('E2E_SELLER_EMAIL', 'seller_e2e@mercasto.com');
        $sellerPassword = env('E2E_SELLER_PASSWORD', 'E2eTestPass99!');

        $adminEmail = env('E2E_ADMIN_EMAIL', 'admin_e2e@mercasto.com');
        $adminPassword = env('E2E_ADMIN_PASSWORD', 'E2eTestPass99!');

        User::updateOrCreate(
            ['email' => $sellerEmail],
            [
                'name' => 'Mercasto Control',
                'password' => bcrypt($sellerPassword),
                'role' => 'individual',
                'is_verified' => true,
                'ip_address' => '127.0.0.1',
            ]
        );

        User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Equipo Técnico Mercasto',
                'password' => bcrypt($adminPassword),
                'role' => 'admin',
                'is_verified' => true,
                'ip_address' => '127.0.0.1',
            ]
        );
    }
}
