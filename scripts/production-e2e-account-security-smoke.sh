#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${E2E_SECURITY_BACKEND_CONTAINER:-mercasto_backend_container}"

echo "== Production E2E account credential smoke =="
docker exec -i "$DB_CONTAINER" php <<'PHP'
<?php
require '/var/www/vendor/autoload.php';
$app = require '/var/www/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

if (! app()->environment('production')) {
    echo "non-production environment: skipped\n";
    exit(0);
}

$source = file_get_contents('/var/www/database/seeders/E2eTestSeeder.php');
preg_match("/sellerPassword = env\\([^,]+, '([^']+)'\\)/", $source, $match);
$default = $match[1] ?? '';
if ($default === '') {
    fwrite(STDERR, "FAIL: could not derive E2E seeder default\n");
    exit(2);
}

$checks = [
    ['email' => 'seller_e2e@mercasto.com', 'role' => 'individual'],
    ['email' => 'admin_e2e@mercasto.com', 'role' => 'admin'],
];
foreach ($checks as $check) {
    $user = App\Models\User::where('email', $check['email'])->first();
    if (! $user || $user->role !== $check['role']) {
        fwrite(STDERR, "FAIL: dedicated E2E account missing or role mismatch\n");
        exit(3);
    }
    if (Illuminate\Support\Facades\Hash::check($default, $user->password)) {
        fwrite(STDERR, "FAIL: production E2E account uses repository seeder default\n");
        exit(4);
    }
}

$knownFixtureEmails = [
    'seller_e2e@mercasto.com', 'admin_e2e@mercasto.com', 'buyer_e2e@mercasto.com',
    'reset_desktop_e2e@mercasto.com', 'reset_mobile_e2e@mercasto.com',
    'twofactor_desktop_e2e@mercasto.com', 'twofactor_mobile_e2e@mercasto.com',
];
$unexpected = App\Models\User::whereIn('email', array_slice($knownFixtureEmails, 2))->count();
$resetTokens = Illuminate\Support\Facades\DB::table('password_reset_tokens')->whereIn('email', $knownFixtureEmails)->count();
if ($unexpected !== 0 || $resetTokens !== 0) {
    fwrite(STDERR, "FAIL: unexpected production E2E fixture accounts or reset tokens exist\n");
    exit(5);
}

echo "production_e2e_accounts=secured\n";
PHP

echo "Production E2E account credential smoke OK"
