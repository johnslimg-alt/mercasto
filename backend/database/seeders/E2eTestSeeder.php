<?php

namespace Database\Seeders;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class E2eTestSeeder extends Seeder
{
    /**
     * Seed the application's E2E test users.
     */
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('E2E test users cannot be seeded in production.');
        }

        $sellerEmail = env('E2E_SELLER_EMAIL', 'seller_e2e@mercasto.com');
        $sellerPassword = env('E2E_SELLER_PASSWORD', 'E2eTestPass99!');

        $adminEmail = env('E2E_ADMIN_EMAIL', 'admin_e2e@mercasto.com');
        $adminPassword = env('E2E_ADMIN_PASSWORD', 'E2eTestPass99!');

        $resetFixtures = [
            ['email' => env('E2E_RESET_EMAIL_DESKTOP', 'reset_desktop_e2e@mercasto.com'), 'token' => env('E2E_RESET_TOKEN_DESKTOP', 'reset-token-desktop-e2e')],
            ['email' => env('E2E_RESET_EMAIL_MOBILE', 'reset_mobile_e2e@mercasto.com'), 'token' => env('E2E_RESET_TOKEN_MOBILE', 'reset-token-mobile-e2e')],
        ];

        foreach ($resetFixtures as $fixture) {
            $resetUser = User::updateOrCreate(
                ['email' => $fixture['email']],
                ['name' => 'Mercasto Reset E2E', 'password' => bcrypt('E2eOldPass99!'), 'role' => 'individual', 'is_verified' => true, 'ip_address' => '127.0.0.1']
            );
            $resetUser->tokens()->delete();
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $fixture['email']],
                ['token' => Hash::make($fixture['token']), 'created_at' => now()]
            );
        }

        $twoFactorFixtures = [
            ['email' => env('E2E_2FA_EMAIL_DESKTOP', 'twofactor_desktop_e2e@mercasto.com'), 'password' => env('E2E_2FA_PASSWORD_DESKTOP', 'E2eTestPass99!'), 'recovery_code' => env('E2E_2FA_RECOVERY_DESKTOP', 'desktop-recovery-e2e')],
            ['email' => env('E2E_2FA_EMAIL_MOBILE', 'twofactor_mobile_e2e@mercasto.com'), 'password' => env('E2E_2FA_PASSWORD_MOBILE', 'E2eTestPass99!'), 'recovery_code' => env('E2E_2FA_RECOVERY_MOBILE', 'mobile-recovery-e2e')],
        ];

        foreach ($twoFactorFixtures as $fixture) {
            $twoFactorUser = User::updateOrCreate(
                ['email' => $fixture['email']],
                [
                    'name' => 'Mercasto 2FA E2E',
                    'password' => bcrypt($fixture['password']),
                    'role' => 'individual',
                    'is_verified' => true,
                    'ip_address' => '127.0.0.1',
                    'two_factor_secret' => 'JBSWY3DPEHPK3PXP',
                    'two_factor_recovery_codes' => json_encode([$fixture['recovery_code']]),
                    'two_factor_confirmed_at' => now(),
                ]
            );
            $twoFactorUser->tokens()->delete();
        }

        $seller = User::updateOrCreate(
            ['email' => $sellerEmail],
            [
                'name' => 'Mercasto Control',
                'password' => bcrypt($sellerPassword),
                'role' => 'individual',
                'is_verified' => true,
                'ip_address' => '127.0.0.1',
                'plan_code' => 'package_free',
                'plan_name' => 'Plan Gratis',
                'monthly_ad_limit' => 3,
                'plan_expires_at' => null,
                'balance' => 0,
            ]
        );

        DB::table('payments')->where('user_id', $seller->id)->delete();

        $buyerEmail = env('E2E_BUYER_EMAIL', 'buyer_e2e@mercasto.com');
        $buyerPassword = env('E2E_BUYER_PASSWORD', 'E2eTestPass99!');

        User::updateOrCreate(
            ['email' => $buyerEmail],
            [
                'name' => 'Mercasto Buyer',
                'password' => bcrypt($buyerPassword),
                'role' => 'individual',
                'is_verified' => true,
                'ip_address' => '127.0.0.1',
            ]
        );

        $fixtureAttributes = [
            'subcategory' => 'Sedán',
            'brand' => 'Toyota',
            'model' => 'Corolla',
            'year' => '2022',
            'kilometers' => '45000',
            'fuel' => 'Gasolina',
        ];

        Ad::withoutEvents(function () use ($seller, $fixtureAttributes): void {
            Ad::updateOrCreate(
                ['user_id' => $seller->id, 'title' => 'Mercasto E2E Active Listing'],
                [
                'description' => 'Anuncio activo aislado para pruebas E2E de reporte y estado.',
                'price' => 150000,
                'location' => 'Cuauhtémoc, Ciudad de México',
                'city' => 'Cuauhtémoc',
                'state' => 'Ciudad de México',
                'latitude' => 19.4326000,
                'longitude' => -99.1332000,
                'category' => 'coches',
                'subcategory' => 'Sedán',
                'condition' => 'usado',
                'attributes' => $fixtureAttributes,
                'status' => 'active',
                'expires_at' => now()->addDays(6),
                'is_catalog_filler' => false,
                ]
            );

            Ad::updateOrCreate(
                ['user_id' => $seller->id, 'title' => 'Mercasto E2E Expired Listing'],
                [
                'description' => 'Anuncio vencido aislado para pruebas E2E de republicación.',
                'price' => 120000,
                'location' => 'Cuauhtémoc, Ciudad de México',
                'city' => 'Cuauhtémoc',
                'state' => 'Ciudad de México',
                'latitude' => 19.4326000,
                'longitude' => -99.1332000,
                'category' => 'coches',
                'subcategory' => 'Sedán',
                'condition' => 'usado',
                'attributes' => $fixtureAttributes,
                'status' => 'expired',
                'expires_at' => now()->subDay(),
                'is_catalog_filler' => false,
                ]
            );
        });

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
