<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

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

        // Seed E2E Seller
        User::updateOrCreate(
            ['email' => $sellerEmail],
            [
                'name' => 'E2E Seller',
                'password' => bcrypt($sellerPassword),
                'role' => 'individual',
                'is_verified' => true,
                'ip_address' => '127.0.0.1'
            ]
        );

        // Seed E2E Admin
        User::updateOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'E2E Admin',
                'password' => bcrypt($adminPassword),
                'role' => 'admin',
                'is_verified' => true,
                'ip_address' => '127.0.0.1'
            ]
        );
    }
}
