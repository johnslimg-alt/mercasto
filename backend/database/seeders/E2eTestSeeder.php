<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class E2eTestSeeder extends Seeder
{
    /**
     * Seed deterministic users for Playwright and other end-to-end tests.
     *
     * This seeder is safe-by-default: DatabaseSeeder only calls it outside
     * production, and this guard prevents accidental production writes unless
     * ALLOW_E2E_SEEDER=true is explicitly set for an intentional smoke run.
     */
    public function run(): void
    {
        if (app()->environment('production') && ! filter_var(env('ALLOW_E2E_SEEDER', false), FILTER_VALIDATE_BOOL)) {
            $this->command?->warn('E2eTestSeeder skipped in production. Set ALLOW_E2E_SEEDER=true to override intentionally.');

            return;
        }

        $password = env('E2E_TEST_PASSWORD', env('E2E_SELLER_PASSWORD', 'E2eTestPass99!'));

        $this->seedUser([
            'email' => env('E2E_SELLER_EMAIL', 'seller_e2e@mercasto.com'),
            'name' => 'E2E Seller',
            'role' => 'individual',
            'referral_code' => 'E2ESELLER',
            'password' => $password,
            'phone_number' => '+520000000001',
        ]);

        $this->seedUser([
            'email' => env('E2E_ADMIN_EMAIL', 'admin_e2e@mercasto.com'),
            'name' => 'E2E Admin',
            'role' => 'admin',
            'referral_code' => 'E2EADMIN',
            'password' => env('E2E_ADMIN_PASSWORD', $password),
            'phone_number' => '+520000000002',
        ]);
    }

    /**
     * @param array{email:string,name:string,role:string,referral_code:string,password:string,phone_number:string} $payload
     */
    private function seedUser(array $payload): void
    {
        $user = User::updateOrCreate(
            ['email' => $payload['email']],
            [
                'name' => $payload['name'],
                'password' => Hash::make($payload['password']),
                'phone_number' => $payload['phone_number'],
                'phone_verified' => true,
                'role' => $payload['role'],
                'plan_code' => 'package_free',
                'plan_name' => 'Plan Gratis',
                'monthly_ad_limit' => 3,
                'balance' => 0,
                'is_verified' => true,
                'referral_code' => $payload['referral_code'],
                'business_profile_enabled' => false,
                'kyc_status' => 'approved',
                'ip_address' => '127.0.0.1',
            ]
        );

        $user->forceFill([
            'email_verified_at' => now(),
        ])->save();
    }
}
