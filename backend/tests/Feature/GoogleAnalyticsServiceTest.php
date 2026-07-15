<?php

namespace Tests\Feature;

use App\Services\GoogleAnalyticsService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleAnalyticsServiceTest extends TestCase
{
    public function test_purchase_uses_verified_payment_data_and_browser_session(): void
    {
        config([
            'services.google_analytics.measurement_id' => 'G-TEST123',
            'services.google_analytics.api_secret' => 'test-secret',
            'services.google_analytics.endpoint' => 'https://www.google-analytics.com/mp/collect',
            'app.frontend_url' => 'https://mercasto.com',
        ]);

        Http::fake([
            'https://www.google-analytics.com/*' => Http::response('', 204),
        ]);

        $payment = (object) [
            'id' => 42,
            'user_id' => 7,
            'ad_id' => 99,
            'clip_checkout_id' => 'clip_checkout_42',
            'clip_payment_request_id' => 'clip-order-42',
            'product_code' => 'featured_7_days',
            'amount' => 149.0,
            'description' => 'Destacado 7 días (Anuncio #99)',
            'created_at' => '2026-07-15 01:00:00',
        ];

        $result = app(GoogleAnalyticsService::class)->sendPurchase(
            $payment,
            '123456789.987654321',
            1784098800,
        );

        $this->assertTrue($result['ok']);
        $this->assertSame('clip-order-42', $result['transaction_id']);

        Http::assertSent(function (ClientRequest $request): bool {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
            $payload = $request->data();
            $event = $payload['events'][0] ?? [];
            $params = $event['params'] ?? [];
            $item = $params['items'][0] ?? [];

            return str_starts_with($request->url(), 'https://www.google-analytics.com/mp/collect?')
                && ($query['measurement_id'] ?? null) === 'G-TEST123'
                && ($query['api_secret'] ?? null) === 'test-secret'
                && ($payload['client_id'] ?? null) === '123456789.987654321'
                && ($payload['user_id'] ?? null) === '7'
                && ($event['name'] ?? null) === 'purchase'
                && ($params['transaction_id'] ?? null) === 'clip-order-42'
                && (float) ($params['value'] ?? 0) === 149.0
                && ($params['currency'] ?? null) === 'MXN'
                && ($params['session_id'] ?? null) === 1784098800
                && ($params['payment_type'] ?? null) === 'clip'
                && ($item['item_id'] ?? null) === 'featured_7_days'
                && ($item['item_category'] ?? null) === 'ad_promotion'
                && (float) ($item['price'] ?? 0) === 149.0
                && ($item['quantity'] ?? null) === 1;
        });
    }

    public function test_ga_cookie_identifiers_are_parsed_for_legacy_and_current_formats(): void
    {
        $this->assertSame(
            '123456789.987654321',
            GoogleAnalyticsService::clientIdFromCookie('GA1.1.123456789.987654321'),
        );
        $this->assertSame(
            1784098800,
            GoogleAnalyticsService::sessionIdFromCookie('GS1.1.1784098800.3.1.1784099900.0.0.0'),
        );
        $this->assertSame(
            1784098800,
            GoogleAnalyticsService::sessionIdFromCookie('GS2.1.s1784098800$o3$g1$t1784099900$j0$l0$h0'),
        );
        $this->assertSame('_ga_VX87HQC817', GoogleAnalyticsService::sessionCookieName('G-VX87HQC817'));
    }

    public function test_missing_secret_skips_without_calling_google(): void
    {
        config([
            'services.google_analytics.measurement_id' => 'G-TEST123',
            'services.google_analytics.api_secret' => null,
        ]);

        Http::fake();

        $result = app(GoogleAnalyticsService::class)->sendPurchase((object) [
            'id' => 1,
            'user_id' => 1,
            'amount' => 99,
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
        ]);

        $this->assertFalse($result['ok']);
        $this->assertTrue($result['skipped']);
        $this->assertSame('missing_configuration', $result['reason']);
        Http::assertNothingSent();
    }
}
