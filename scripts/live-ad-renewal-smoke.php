<?php

use App\Services\AdRenewalService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;

require '/var/www/vendor/autoload.php';
$app = require '/var/www/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$failures = [];
$check = function (bool $condition, string $message) use (&$failures): void {
    echo ($condition ? 'PASS ' : 'FAIL ') . $message . PHP_EOL;
    if (! $condition) {
        $failures[] = $message;
    }
};

$price = (float) config('marketplace.ad_renewal_price_mxn');
$days = (int) config('marketplace.ad_renewal_days');
$product = (string) config('marketplace.ad_renewal_product_code');

echo json_encode([
    'environment' => app()->environment(),
    'price_mxn' => $price,
    'days' => $days,
    'product_code' => $product,
    'clip_api_key_present' => ! empty(config('services.clip.api_key')),
    'clip_api_secret_present' => ! empty(config('services.clip.api_secret')),
    'clip_webhook_secret_present' => ! empty(config('services.clip.webhook_secret')),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;

$check($price === 49.0, 'renewal price is exactly 49 MXN');
$check($days === 7, 'renewal duration is exactly 7 days');
$check($product === 'ad_renewal_7_days', 'renewal product code is correct');
$check(! empty(config('services.clip.api_key')), 'Clip API key is configured');
$check(! empty(config('services.clip.api_secret')), 'Clip API secret is configured');
$check(
    DB::table('migrations')->where('migration', '2026_07_19_000001_enforce_seven_day_ad_lifetime')->exists(),
    'seven-day lifetime migration is applied'
);

$routes = collect(Route::getRoutes()->getRoutes());
$check(
    $routes->contains(fn ($route) => preg_match('#^api/ads/\{[^}]+\}/renew$#', $route->uri()) === 1),
    'renew endpoint is registered'
);
$check($routes->contains(fn ($route) => $route->uri() === 'api/webhooks/clip/ad-renewal'), 'Clip renewal webhook is registered');

try {
    $clipProbe = Http::timeout(10)
        ->withBasicAuth((string) config('services.clip.api_key'), (string) config('services.clip.api_secret'))
        ->acceptJson()
        ->get('https://api.payclip.com/v2/checkout/mercasto-live-smoke-does-not-exist');
    echo json_encode(['clip_read_only_probe_status' => $clipProbe->status()]) . PHP_EOL;
    $check(! in_array($clipProbe->status(), [401, 403], true) && $clipProbe->status() < 500, 'Clip accepted authenticated read-only API probe');
} catch (Throwable $error) {
    echo 'Clip probe error: ' . $error->getMessage() . PHP_EOL;
    $check(false, 'Clip authenticated read-only API probe completed');
}

$candidate = DB::table('ads')
    ->whereNotNull('user_id')
    ->whereIn('status', ['active', 'expired', 'paused', 'inactive'])
    ->orderByDesc('id')
    ->first();
$check((bool) $candidate, 'a production ad is available for rollback-only service smoke');

if ($candidate) {
    $original = [
        'status' => $candidate->status,
        'expires_at' => $candidate->expires_at,
    ];
    $marker = 'live_smoke_' . bin2hex(random_bytes(8));
    config(['broadcasting.default' => 'null']);

    DB::beginTransaction();
    try {
        DB::table('ads')->where('id', $candidate->id)->update([
            'status' => 'expired',
            'expires_at' => now()->subDay(),
            'updated_at' => now(),
        ]);

        $paymentId = DB::table('payments')->insertGetId([
            'user_id' => $candidate->user_id,
            'ad_id' => $candidate->id,
            'clip_checkout_id' => $marker,
            'clip_payment_request_id' => $marker,
            'amount' => 49,
            'description' => 'Rollback-only live renewal smoke',
            'product_code' => 'ad_renewal_7_days',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $expiresAt = app(AdRenewalService::class)->fulfill($payment);
        $updatedAd = DB::table('ads')->where('id', $candidate->id)->first();
        $updatedPayment = DB::table('payments')->where('id', $paymentId)->first();

        $remainingHours = $expiresAt ? now()->diffInHours(Carbon::parse($expiresAt), false) : -1;
        $check($expiresAt !== null, 'renewal service returned a new expiry');
        $check($updatedAd->status === 'active', 'expired ad becomes active after fulfillment');
        $check($remainingHours >= 167 && $remainingHours <= 169, 'new expiry is seven days from now');
        $check($updatedPayment->status === 'paid', 'payment becomes paid after fulfillment');
    } finally {
        DB::rollBack();
    }

    $restored = DB::table('ads')->where('id', $candidate->id)->first();
    $check($restored->status === $original['status'], 'ad status was restored by rollback');
    $check((string) $restored->expires_at === (string) $original['expires_at'], 'ad expiry was restored by rollback');
    $check(! DB::table('payments')->where('clip_checkout_id', $marker)->exists(), 'temporary payment was removed by rollback');
}

echo json_encode([
    'active_ads' => DB::table('ads')->where('status', 'active')->count(),
    'active_ads_already_due' => DB::table('ads')
        ->where('status', 'active')
        ->whereNotNull('expires_at')
        ->where('expires_at', '<=', now())
        ->count(),
    'pending_renewal_payments' => DB::table('payments')
        ->where('product_code', 'ad_renewal_7_days')
        ->where('status', 'pending')
        ->count(),
    'paid_renewal_payments' => DB::table('payments')
        ->where('product_code', 'ad_renewal_7_days')
        ->where('status', 'paid')
        ->count(),
], JSON_PRETTY_PRINT) . PHP_EOL;

if ($failures) {
    fwrite(STDERR, 'Failures: ' . implode('; ', $failures) . PHP_EOL);
    exit(1);
}
