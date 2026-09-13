<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Consent gate for every Mercasto-server → third-party egress path.
 *
 * Two hops are deliberately different and must stay different:
 *  - browser → Mercasto's own server (the first-party relay) is receipt by Mercasto
 *    and stays ungated;
 *  - Mercasto's server → Meta / TikTok / GA4 / OpenAI is an onward transfer and
 *    requires an explicit affirmative signal from the browser, never an absent one.
 *
 * Every test in this class therefore has a negative control (no signal, false,
 * malformed, or a withdrawn account preference ⇒ zero vendor traffic) and a
 * positive control proving that consented traffic is unchanged.
 */
class VendorEgressConsentTest extends TestCase
{
    use RefreshDatabase;

    private const CHECKOUT_ID = 'clip_egress_consent_0001';

    private const PAYMENT_REQUEST_ID = 'e1961597-eccd-4bf5-94f3-c343d529caaa';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.facebook.pixel_id' => 'pixel_egress_test',
            'services.facebook.access_token' => 'meta-test-token',
            'services.facebook.graph_version' => 'v25.0',
            'services.tiktok.pixel_code' => 'tiktok-pixel-test',
            'services.tiktok.access_token' => 'tiktok-test-token',
            'services.tiktok.test_event_code' => null,
            'services.tiktok.events_api_endpoint' => 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
            'services.google_analytics.measurement_id' => 'G-EGRESSTEST',
            'services.google_analytics.api_secret' => 'ga4-test-secret',
            'services.google_analytics.endpoint' => 'https://www.google-analytics.com/mp/collect',
            'services.openai_ads.pixel_id' => 'px_egress_test',
            'services.openai_ads.api_key' => 'openai-test-key',
            'services.openai_ads.events_api_endpoint' => 'https://bzr.openai.com/v1/events',
            'services.clip.api_key' => 'clip-test-key',
            'services.clip.api_secret' => 'clip-test-secret',
            'services.clip.checkout_url' => 'https://api.payclip.com/v2/checkout',
            'services.clip.verification_url' => 'https://api.payclip.com/v2/checkout',
            'app.frontend_url' => 'https://mercasto.com',
        ]);

        // Belt and braces: no test in this class can reach a real vendor host.
        Http::preventStrayRequests();
        Http::fake([
            'graph.facebook.com/*' => Http::response(['events_received' => 1], 200),
            'business-api.tiktok.com/*' => Http::response(['code' => 0, 'message' => 'OK'], 200),
            'www.google-analytics.com/*' => Http::response('', 204),
            'bzr.openai.com/*' => Http::response(['accepted' => 1], 200),
            'api.payclip.com/*' => function (ClientRequest $request) {
                if ($request->method() === 'POST') {
                    return Http::response([
                        'payment_request_id' => self::PAYMENT_REQUEST_ID,
                        'payment_request_url' => 'https://payclip.test/checkout/'.self::PAYMENT_REQUEST_ID,
                    ], 200);
                }

                return Http::response([
                    'payment_request_id' => self::PAYMENT_REQUEST_ID,
                    'object_type' => 'payment_link',
                    'status' => 'CHECKOUT_COMPLETED',
                    'amount' => 99.00,
                    'currency' => 'MXN',
                ], 200);
            },
        ]);
    }

    // ---------------------------------------------------------------------
    // Path A/B/C: MetaEventController relay (post-ad, wishlist, contact)
    // ---------------------------------------------------------------------

    public function test_relay_without_a_consent_signal_does_not_reach_meta_or_tiktok(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $ad = $this->createRecentAd($user);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/post-ad', [
            'event_id' => 'egress_absent_signal',
            'listing_id' => $ad->id,
        ]);

        // First-party receipt is preserved: the relay still accepts and answers.
        $response->assertOk()->assertJsonPath('event_id', 'egress_absent_signal');

        $this->assertSame([], $this->vendorRequests());
    }

    public function test_relay_with_false_or_malformed_signal_does_not_reach_meta_or_tiktok(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $ad = $this->createRecentAd($user);

        foreach ([false, 'maybe', 0, ''] as $signal) {
            $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/post-ad', [
                'event_id' => 'egress_non_affirmative_signal',
                'listing_id' => $ad->id,
                'analytics_tracking_consent' => $signal,
            ])->assertOk();
        }

        $this->assertSame([], $this->vendorRequests());
    }

    public function test_relay_with_a_withdrawn_account_preference_does_not_reach_meta_or_tiktok(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => false],
        ]);
        $ad = $this->createRecentAd($user);

        $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/post-ad', [
            'event_id' => 'egress_withdrawn',
            'listing_id' => $ad->id,
            'analytics_tracking_consent' => true,
        ])->assertOk();

        $this->assertSame([], $this->vendorRequests());
    }

    public function test_relay_with_consent_still_transmits_the_unchanged_meta_and_tiktok_payload(): void
    {
        $user = User::factory()->create([
            'email' => 'egress-consented@example.test',
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $ad = $this->createRecentAd($user);

        $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/post-ad', [
            'event_id' => 'egress_consented_event',
            'listing_id' => $ad->id,
            'category' => 'client-spoofed-category',
            'city' => 'client-spoofed-city',
            'url' => 'https://mercasto.com/listings/'.$ad->id,
            'analytics_tracking_consent' => true,
        ])->assertOk()->assertJsonPath('meta_ok', true)->assertJsonPath('tiktok_ok', true);

        $meta = $this->requestTo('graph.facebook.com');
        $this->assertNotNull($meta, 'Consented relay must still reach Meta.');
        $metaEvent = $meta->data()['data'][0] ?? [];
        $this->assertSame('PostAd', $metaEvent['event_name'] ?? null);
        $this->assertSame('egress_consented_event', $metaEvent['event_id'] ?? null);
        $this->assertSame('motor', $metaEvent['custom_data']['category'] ?? null);
        $this->assertSame(
            hash('sha256', 'egress-consented@example.test'),
            $metaEvent['user_data']['em'][0] ?? null,
        );

        $tiktok = $this->requestTo('business-api.tiktok.com');
        $this->assertNotNull($tiktok, 'Consented relay must still reach TikTok.');
        $tiktokEvent = $tiktok->data()['data'][0] ?? [];
        $this->assertSame('Lead', $tiktokEvent['event'] ?? null);
        $this->assertSame('ad_'.$ad->id, $tiktokEvent['properties']['content_ids'][0] ?? null);
    }

    public function test_public_contact_relay_egress_follows_the_signal_for_anonymous_visitors(): void
    {
        // Deliberate decision for the null-user case: an anonymous caller has no
        // account record to consult, so the explicit per-request affirmative is the
        // consent record. Signed-out consented visitors therefore keep measurement,
        // while an absent signal still blocks every vendor.
        $this->postJson('/api/meta/events/contact', [
            'event_id' => 'guest_contact_no_signal',
            'listing_id' => '123',
            'url' => 'https://mercasto.com/listings/123',
        ])->assertOk();

        $this->assertSame([], $this->vendorRequests(), 'An absent signal must never transmit for a guest.');

        $this->postJson('/api/meta/events/contact', [
            'event_id' => 'guest_contact_consented',
            'listing_id' => '123',
            'method' => 'whatsapp',
            'url' => 'https://mercasto.com/listings/123',
            'analytics_tracking_consent' => true,
        ])->assertOk();

        $meta = $this->requestTo('graph.facebook.com');
        $this->assertNotNull($meta, 'A consented signed-out visitor must keep contact measurement.');
        $this->assertSame('Contact', $meta->data()['data'][0]['event_name'] ?? null);

        $tiktok = $this->requestTo('business-api.tiktok.com');
        $this->assertNotNull($tiktok, 'A consented signed-out visitor must keep contact measurement.');
        $this->assertSame('Contact', $tiktok->data()['data'][0]['event'] ?? null);
    }

    public function test_wishlist_relay_follows_the_same_gate(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);

        $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/wishlist', [
            'event_id' => 'wishlist_no_signal',
            'listing_id' => '6336',
        ])->assertOk();

        $this->assertSame([], $this->vendorRequests());

        $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/wishlist', [
            'event_id' => 'wishlist_consented',
            'listing_id' => '6336',
            'analytics_tracking_consent' => true,
        ])->assertOk();

        $this->assertSame('AddToWishlist', $this->requestTo('graph.facebook.com')?->data()['data'][0]['event_name'] ?? null);
        $this->assertSame('AddToWishlist', $this->requestTo('business-api.tiktok.com')?->data()['data'][0]['event'] ?? null);
    }

    public function test_openai_relay_gate_is_unchanged(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $ad = $this->createRecentAd($user);

        // OpenAI keeps its own two-factor predicate: signal plus account preference.
        $this->actingAs($user, 'sanctum')->postJson('/api/meta/events/post-ad', [
            'event_id' => 'openai_consented',
            'listing_id' => $ad->id,
            'openai_measurement_consent' => true,
        ])->assertOk()->assertJsonPath('openai_ok', true);

        $this->assertNotNull($this->requestTo('bzr.openai.com'));

        // The public contact relay is intentionally not an OpenAI lead conversion.
        $this->postJson('/api/meta/events/contact', [
            'event_id' => 'openai_guest_contact',
            'listing_id' => '123',
            'openai_measurement_consent' => true,
        ])->assertOk()->assertJsonPath('openai_ok', false);

        $this->assertSame(1, $this->requestsTo('bzr.openai.com')->count());
    }

    // ---------------------------------------------------------------------
    // Path G/H/I: Clip checkout + Clip webhook (TikTok funnel, GA4, Meta)
    // ---------------------------------------------------------------------

    public function test_clip_webhook_without_a_checkout_consent_decision_reaches_no_vendor(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $this->createPendingPayment($user);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();

        $this->assertDatabaseHas('payments', ['status' => 'paid']);
        $this->assertSame([], $this->vendorRequests(), 'No cached consent decision ⇒ no onward transfer.');
    }

    public function test_clip_webhook_with_consent_still_transmits_tiktok_ga4_and_meta_purchases(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $this->createPendingPayment($user);
        $payment = DB::table('payments')->where('clip_checkout_id', self::CHECKOUT_ID)->first();

        Cache::put('tiktok_checkout_consent:'.$payment->id, true, now()->addDay());
        Cache::put('ga4_checkout_consent:'.$payment->id, true, now()->addDay());
        Cache::put('meta_purchase_context:'.self::CHECKOUT_ID, [
            'analytics_tracking_consent' => true,
            'client_ip_address' => '203.0.113.44',
            'client_user_agent' => 'MercastoEgressConsent/1.0',
        ], now()->addDay());

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();

        $tiktok = $this->requestTo('business-api.tiktok.com');
        $this->assertNotNull($tiktok, 'Consented webhook must still reach TikTok.');
        $this->assertSame('Purchase', $tiktok->data()['data'][0]['event'] ?? null);
        $this->assertSame('paid', $tiktok->data()['data'][0]['properties']['status'] ?? null);

        $this->assertNotNull($this->requestTo('www.google-analytics.com'), 'Consented webhook must still reach GA4.');
        $this->assertNotNull($this->requestTo('graph.facebook.com'), 'Consented webhook must still reach Meta.');
    }

    public function test_clip_webhook_blocked_when_the_account_withdrew_after_checkout(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => false],
        ]);
        $this->createPendingPayment($user);
        $payment = DB::table('payments')->where('clip_checkout_id', self::CHECKOUT_ID)->first();

        Cache::put('tiktok_checkout_consent:'.$payment->id, true, now()->addDay());
        Cache::put('ga4_checkout_consent:'.$payment->id, true, now()->addDay());
        Cache::put('meta_purchase_context:'.self::CHECKOUT_ID, [
            'analytics_tracking_consent' => true,
        ], now()->addDay());

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();

        $this->assertSame([], $this->vendorRequests(), 'A withdrawal recorded on the account must block egress.');
    }

    public function test_clip_checkout_caches_the_explicit_consent_decision_for_the_webhook(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/payment/clip', [
            'amount' => 99,
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
            'analytics_tracking_consent' => true,
        ])->assertOk();

        $payment = DB::table('payments')->where('status', 'pending')->first();
        $this->assertNotNull($payment);
        $this->assertTrue(Cache::get('tiktok_checkout_consent:'.$payment->id));
        $this->assertTrue(Cache::get('ga4_checkout_consent:'.$payment->id));
        $this->assertTrue(
            (bool) (Cache::get('meta_purchase_context:'.$payment->clip_checkout_id)['analytics_tracking_consent'] ?? false),
        );
    }

    public function test_clip_checkout_without_a_signal_caches_a_blocking_decision(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/payment/clip', [
            'amount' => 99,
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
        ])->assertOk();

        $payment = DB::table('payments')->where('status', 'pending')->first();
        $this->assertNotNull($payment);
        $this->assertNotTrue(Cache::get('tiktok_checkout_consent:'.$payment->id, false));
        $this->assertNotTrue(Cache::get('ga4_checkout_consent:'.$payment->id, false));
        $this->assertNotTrue(
            (bool) (Cache::get('meta_purchase_context:'.$payment->clip_checkout_id)['analytics_tracking_consent'] ?? false),
        );

        // And the whole checkout → webhook journey transmits nothing.
        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();
        $this->assertSame([], $this->vendorRequests());
    }

    public function test_balance_checkout_funnel_follows_the_request_signal(): void
    {
        $user = User::factory()->create([
            'balance' => 500,
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/payment/balance', [
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
        ])->assertOk();

        $this->assertSame([], $this->vendorRequests(), 'Absent signal must block the balance funnel.');

        $this->postJson('/api/payment/balance', [
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
            'analytics_tracking_consent' => true,
        ])->assertOk();

        $events = $this->requestsTo('business-api.tiktok.com')
            ->map(fn (ClientRequest $request) => $request->data()['data'][0]['event'] ?? null)
            ->values()
            ->all();

        $this->assertSame(['AddToCart', 'InitiateCheckout', 'Purchase'], $events);
    }

    public function test_consent_withdrawal_invalidates_the_cached_checkout_decisions(): void
    {
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $this->createPendingPayment($user);
        $payment = DB::table('payments')->where('clip_checkout_id', self::CHECKOUT_ID)->first();

        Cache::put('tiktok_checkout_consent:'.$payment->id, true, now()->addDay());
        Cache::put('ga4_checkout_consent:'.$payment->id, true, now()->addDay());
        Cache::put('meta_purchase_context:'.self::CHECKOUT_ID, [
            'analytics_tracking_consent' => true,
        ], now()->addDay());

        Sanctum::actingAs($user);
        $this->postJson('/api/user/privacy/analytics-consent', [
            'analytics_tracking_consent' => false,
        ])->assertOk();

        $this->assertFalse(Cache::has('tiktok_checkout_consent:'.$payment->id));
        $this->assertFalse(Cache::has('ga4_checkout_consent:'.$payment->id));
        $this->assertFalse(Cache::has('meta_purchase_context:'.self::CHECKOUT_ID));
    }

    // ---------------------------------------------------------------------
    // helpers
    // ---------------------------------------------------------------------

    private function createRecentAd(User $user): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Anuncio para auditoría de egress',
            'description' => 'Contrato de consentimiento de egress',
            'price' => 1250,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'category' => 'motor',
            'status' => 'pending',
        ]);
    }

    /** @return Collection<int, ClientRequest> */
    private function requestsTo(string $host)
    {
        return collect(Http::recorded())
            ->map(fn (array $entry) => $entry[0])
            ->filter(fn (ClientRequest $request) => str_contains($request->url(), $host))
            ->values();
    }

    private function requestTo(string $host): ?ClientRequest
    {
        return $this->requestsTo($host)->first();
    }

    /** @return list<string> */
    private function vendorRequests(): array
    {
        return collect(Http::recorded())
            ->map(fn (array $entry) => $entry[0]->url())
            ->filter(fn (string $url) => str_contains($url, 'graph.facebook.com')
                || str_contains($url, 'business-api.tiktok.com')
                || str_contains($url, 'www.google-analytics.com')
                || str_contains($url, 'bzr.openai.com'))
            ->values()
            ->all();
    }

    private function createPendingPayment(User $user): void
    {
        DB::table('payments')->insert([
            'user_id' => $user->id,
            'ad_id' => null,
            'clip_checkout_id' => self::CHECKOUT_ID,
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'amount' => 99.00,
            'description' => 'Plan Impulso',
            'product_code' => 'package_impulso',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @return array<string, mixed> */
    private function completedWebhookPayload(): array
    {
        return [
            'id' => 'bc631b13-bda7-4473-9181-bc43e04dfa28',
            'api_version' => '1.0',
            'payment_request_id' => self::PAYMENT_REQUEST_ID,
            'resource' => 'CHECKOUT',
            'resource_status' => 'COMPLETED',
            'detail_type' => 'Payment Request Completed',
            'completed_at' => now()->toIso8601String(),
            'me_reference_id' => self::CHECKOUT_ID,
        ];
    }
}
