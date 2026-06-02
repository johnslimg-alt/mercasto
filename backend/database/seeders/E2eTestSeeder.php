<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

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

        $sellerPassword = env('E2E_TEST_PASSWORD', env('E2E_SELLER_PASSWORD', 'E2eTestPass99!'));

        $this->seedUser([
            'email' => env('E2E_SELLER_EMAIL', 'seller_e2e@mercasto.com'),
            'name' => 'E2E Seller',
            'role' => 'individual',
            'referral_code' => 'E2ESELLER',
            'password' => $sellerPassword,
            'phone_number' => '+520000000001',
        ]);

        $this->seedUser([
            'email' => env('E2E_ADMIN_EMAIL', 'admin_e2e@mercasto.com'),
            'name' => 'E2E Admin',
            'role' => 'admin',
            'referral_code' => 'E2EADMIN',
            'password' => env('E2E_ADMIN_PASSWORD', $sellerPassword),
            'phone_number' => '+520000000002',
        ]);
    }

    /**
     * @param array{email:string,name:string,role:string,referral_code:string,password:string,phone_number:string} $payload
     */
    private function seedUser(array $payload): void
    {
        $attributes = [
            'name' => $payload['name'],
            'password' => Hash::make($payload['password']),
        ];

        if (Schema::hasColumn('users', 'phone_number')) {
            $attributes['phone_number'] = $payload['phone_number'];
        }

        if (Schema::hasColumn('users', 'phone_verified')) {
            $attributes['phone_verified'] = true;
        }

        if (Schema::hasColumn('users', 'role')) {
            $attributes['role'] = $payload['role'];
        }

        if (Schema::hasColumn('users', 'plan_code')) {
            $attributes['plan_code'] = 'package_free';
        }

        if (Schema::hasColumn('users', 'plan_name')) {
            $attributes['plan_name'] = 'Plan Gratis';
        }

        if (Schema::hasColumn('users', 'monthly_ad_limit')) {
            $attributes['monthly_ad_limit'] = 3;
        }

        if (Schema::hasColumn('users', 'balance')) {
            $attributes['balance'] = 0;
        }

        if (Schema::hasColumn('users', 'is_verified')) {
            $attributes['is_verified'] = true;
        }

        if (Schema::hasColumn('users', 'referral_code')) {
            $attributes['referral_code'] = $payload['referral_code'];
        }

        if (Schema::hasColumn('users', 'business_profile_enabled')) {
            $attributes['business_profile_enabled'] = false;
        }

        if (Schema::hasColumn('users', 'kyc_status')) {
            $attributes['kyc_status'] = 'approved';
        }

        if (Schema::hasColumn('users', 'ip_address')) {
            $attributes['ip_address'] = '127.0.0.1';
        }

        $user = User::updateOrCreate(
            ['email' => $payload['email']],
            $attributes,
        );

        if (Schema::hasColumn('users', 'email_verified_at')) {
            $user->forceFill([
                'email_verified_at' => now(),
            ])->save();
        }
    }
}