<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ClipWebhookTest extends TestCase
{
    use RefreshDatabase;

    private const PAYMENT_REQUEST_ID = 'e1961597-eccd-4bf5-94f3-c343d529caaa';

    private const CHECKOUT_ID = 'clip_0b05056d-1f2b-4af9-913d-653197b0b0a6';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.clip.api_key' => 'test-api-key',
            'services.clip.api_secret' => 'test-api-secret',
            'services.clip.webhook_secret' => 'test-webhook-secret',
            'services.facebook.pixel_id' => null,
            'services.facebook.access_token' => null,
        ]);

        Event::fake([NewNotification::class]);
        Http::preventStrayRequests();
    }

    public function test_unsigned_completed_checkout_is_verified_and_fulfilled_once(): void
    {
        $user = User::factory()->create();
        $this->createPendingPayment($user);

        Http::fake([
            $this->clipStatusUrl() => Http::response($this->completedCheckoutResponse(), 200),
        ]);

        $response = $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload());
        $duplicateResponse = $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload());

        $response->assertOk()->assertJson(['status' => 'received']);
        $duplicateResponse->assertOk()->assertJson(['status' => 'received']);
        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'paid',
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'title' => 'Pago exitoso!',
        ]);
        $this->assertDatabaseCount('user_notifications', 1);
        Event::assertDispatchedTimes(NewNotification::class, 1);

        $storedAudit = json_decode((string) DB::table('payments')
            ->where('clip_payment_request_id', self::PAYMENT_REQUEST_ID)
            ->value('webhook_payload'), true);
        $this->assertSame([
            'schema_version', 'provider', 'event', 'resource',
            'provider_status', 'recorded_at',
        ], array_keys($storedAudit));
        $this->assertSame('verified_checkout', $storedAudit['event']);
        $this->assertStringNotContainsString('4242', json_encode($storedAudit));
        $this->assertStringNotContainsString('private-bank', json_encode($storedAudit));
        $this->assertNull(DB::table('payments')
            ->where('clip_payment_request_id', self::PAYMENT_REQUEST_ID)
            ->value('clip_payment_request_url'));

        Http::assertSent(function (ClientRequest $request): bool {
            return $request->method() === 'GET'
                && $request->url() === $this->clipStatusUrl()
                && $request->hasHeader(
                    'Authorization',
                    'Basic ' . base64_encode('test-api-key:test-api-secret')
                );
        });
        Http::assertSentCount(1);
    }

    public function test_verified_paid_checkout_sends_one_openai_order_created_conversion(): void
    {
        config([
            'services.openai_ads.pixel_id' => 'px_order_test',
            'services.openai_ads.api_key' => 'test-key',
            'services.openai_ads.events_api_endpoint' => 'https://bzr.openai.com/v1/events',
            'app.frontend_url' => 'https://mercasto.com',
        ]);
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => true],
        ]);
        $this->createPendingPayment($user);
        $payment = DB::table('payments')->where('clip_checkout_id', self::CHECKOUT_ID)->first();
        Cache::put('meta_purchase_context:' . self::CHECKOUT_ID, [
            'openai_measurement_consent' => true,
            'source_url' => 'https://mercasto.com/promocionar?plan=boost#checkout',
            'client_ip_address' => '203.0.113.44',
            'client_user_agent' => 'MercastoOrderTest/1.0',
        ], now()->addHour());

        Http::fake([
            $this->clipStatusUrl() => Http::response($this->completedCheckoutResponse(), 200),
            'bzr.openai.com/*' => Http::response(['accepted' => 1], 200),
        ]);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();
        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();

        $openAiRequests = collect(Http::recorded())->filter(
            fn ($entry) => str_contains($entry[0]->url(), 'bzr.openai.com')
        );
        $this->assertCount(1, $openAiRequests);
        $event = $openAiRequests->first()[0]->data()['events'][0] ?? [];
        $this->assertSame('order_created_payment_' . $payment->id, $event['id'] ?? null);
        $this->assertSame('order_created', $event['type'] ?? null);
        $this->assertSame('contents', $event['data']['type'] ?? null);
        $this->assertSame(1900, $event['data']['amount'] ?? null);
        $this->assertSame('MXN', $event['data']['currency'] ?? null);
        $this->assertSame('https://mercasto.com/promocionar', $event['source_url'] ?? null);
    }

    public function test_withdrawn_analytics_consent_blocks_delayed_openai_order_conversion(): void
    {
        config([
            'services.openai_ads.pixel_id' => 'px_order_test',
            'services.openai_ads.api_key' => 'test-key',
            'services.openai_ads.events_api_endpoint' => 'https://bzr.openai.com/v1/events',
        ]);
        $user = User::factory()->create([
            'notification_preferences' => ['analytics_tracking_consent' => false],
        ]);
        $this->createPendingPayment($user);
        Cache::put('meta_purchase_context:' . self::CHECKOUT_ID, [
            'openai_measurement_consent' => true,
            'source_url' => 'https://mercasto.com/promocionar?plan=boost',
        ], now()->addHour());

        Http::fake([
            $this->clipStatusUrl() => Http::response($this->completedCheckoutResponse(), 200),
            'bzr.openai.com/*' => Http::response(['accepted' => 1], 200),
        ]);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();

        Http::assertNotSent(fn (ClientRequest $request): bool => str_contains($request->url(), 'bzr.openai.com'));
    }

    public function test_duplicate_completed_checkout_does_not_double_credit_balance(): void
    {
        $user = User::factory()->create(['balance' => 0]);
        $this->createPendingPayment($user, [
            'amount' => 100.00,
            'description' => '100 Créditos Mercasto',
            'product_code' => 'credits_100',
        ]);

        Http::fake([
            $this->clipStatusUrl() => Http::response(
                $this->completedCheckoutResponse(['amount' => 100.00]),
                200
            ),
        ]);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())
            ->assertOk()
            ->assertJson(['status' => 'received']);
        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())
            ->assertOk()
            ->assertJson(['status' => 'received']);

        $this->assertSame(100.0, (float) DB::table('users')->where('id', $user->id)->value('balance'));
        $this->assertDatabaseCount('user_notifications', 1);
        Http::assertSentCount(1);
    }

    public function test_duplicate_completed_checkout_keeps_one_promotion_ledger_row(): void
    {
        $user = User::factory()->create();
        $adId = DB::table('ads')->insertGetId([
            'user_id' => $user->id,
            'title' => 'Auto para prueba de promoción',
            'description' => 'Anuncio de prueba',
            'price' => 100000,
            'category' => 'motor',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->createPendingPayment($user, [
            'ad_id' => $adId,
            'description' => 'Subir 24 horas (Anuncio #' . $adId . ')',
            'product_code' => 'boost_1_day',
        ]);

        Http::fake([
            $this->clipStatusUrl() => Http::response($this->completedCheckoutResponse(), 200),
        ]);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();
        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())->assertOk();

        $this->assertDatabaseHas('ads', [
            'id' => $adId,
            'promoted' => 'urgente',
            'boost_type' => 'boost_1_day',
        ]);
        $this->assertDatabaseHas('ad_promotions', [
            'ad_id' => $adId,
            'type' => 'lift',
        ]);
        $this->assertDatabaseCount('ad_promotions', 1);
        $this->assertDatabaseCount('user_notifications', 1);
        Http::assertSentCount(1);
    }

    public function test_paid_promotion_for_ad_that_expired_before_webhook_requires_manual_review(): void
    {
        $user = User::factory()->create();
        $adId = DB::table('ads')->insertGetId([
            'user_id' => $user->id,
            'title' => 'Promoción que venció durante checkout',
            'description' => 'Anuncio elegible al iniciar el checkout y vencido antes del webhook.',
            'price' => 100000,
            'category' => 'motor',
            'status' => 'active',
            'expires_at' => now()->subMinute(),
            'is_catalog_filler' => false,
            'created_at' => now()->subHour(),
            'updated_at' => now(),
        ]);
        $this->createPendingPayment($user, [
            'ad_id' => $adId,
            'description' => 'Subir 24 horas (Anuncio #' . $adId . ')',
            'product_code' => 'boost_1_day',
        ]);

        Http::fake([
            $this->clipStatusUrl() => Http::response($this->completedCheckoutResponse(), 200),
        ]);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())
            ->assertOk()
            ->assertJson(['status' => 'received']);
        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())
            ->assertOk();

        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'paid_review',
        ]);
        $this->assertNull(DB::table('ads')->where('id', $adId)->value('boost_expires_at'));
        $this->assertDatabaseCount('ad_promotions', 0);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'title' => 'Pago recibido — promoción en revisión',
        ]);
        $this->assertSame(1, DB::table('user_notifications')->where('title', 'Pago recibido — promoción en revisión')->count());
        $this->assertSame(0, DB::table('user_notifications')->where('title', 'Pago exitoso!')->count());
        Http::assertSentCount(1);
    }

    public function test_paid_promotion_does_not_overwrite_a_newer_active_promotion(): void
    {
        $user = User::factory()->create();
        $newerExpiry = now()->addDays(6);
        $adId = DB::table('ads')->insertGetId([
            'user_id' => $user->id,
            'title' => 'Promoción más reciente protegida',
            'description' => 'Una segunda promoción se activó mientras Clip completaba el checkout anterior.',
            'price' => 100000,
            'category' => 'motor',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
            'promoted' => 'highlight',
            'boost_type' => 'highlight_7_days',
            'boost_expires_at' => $newerExpiry,
            'created_at' => now()->subHour(),
            'updated_at' => now(),
        ]);
        DB::table('ad_promotions')->insert([
            'ad_id' => $adId,
            'type' => 'highlight',
            'expires_at' => $newerExpiry,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->createPendingPayment($user, [
            'ad_id' => $adId,
            'description' => 'Subir 24 horas (Anuncio #' . $adId . ')',
            'product_code' => 'boost_1_day',
        ]);

        Http::fake([
            $this->clipStatusUrl() => Http::response($this->completedCheckoutResponse(), 200),
        ]);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())
            ->assertOk()
            ->assertJson(['status' => 'received']);

        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'paid_review',
        ]);
        $ad = DB::table('ads')->where('id', $adId)->first();
        $this->assertSame('highlight', $ad->promoted);
        $this->assertSame('highlight_7_days', $ad->boost_type);
        $this->assertSame($newerExpiry->format('Y-m-d H:i:s'), (string) $ad->boost_expires_at);
        $this->assertDatabaseCount('ad_promotions', 1);
        $this->assertDatabaseHas('ad_promotions', ['ad_id' => $adId, 'type' => 'highlight']);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'title' => 'Pago recibido — promoción en revisión',
        ]);
        Http::assertSentCount(1);
    }

    public function test_paid_promotion_for_deleted_ad_requires_manual_review(): void
    {
        $user = User::factory()->create();
        $adId = DB::table('ads')->insertGetId([
            'user_id' => $user->id,
            'title' => 'Promoción eliminada durante checkout',
            'description' => 'El anuncio desaparece después de iniciar la compra de promoción.',
            'price' => 100000,
            'category' => 'motor',
            'status' => 'active',
            'expires_at' => now()->addDays(3),
            'is_catalog_filler' => false,
            'created_at' => now()->subHour(),
            'updated_at' => now(),
        ]);
        $this->createPendingPayment($user, [
            'ad_id' => $adId,
            'description' => 'Subir 24 horas (Anuncio #' . $adId . ')',
            'product_code' => 'boost_1_day',
        ]);
        DB::table('ads')->where('id', $adId)->delete();
        $this->assertNull(DB::table('payments')->where('clip_checkout_id', self::CHECKOUT_ID)->value('ad_id'));

        Http::fake([
            $this->clipStatusUrl() => Http::response($this->completedCheckoutResponse(), 200),
        ]);

        $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload())
            ->assertOk()
            ->assertJson(['status' => 'received']);

        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'paid_review',
        ]);
        $this->assertDatabaseCount('ad_promotions', 0);
        $this->assertSame(1, DB::table('user_notifications')->where('title', 'Pago recibido — promoción en revisión')->count());
        $this->assertSame(0, DB::table('user_notifications')->where('title', 'Pago exitoso!')->count());
        Http::assertSentCount(1);
    }

    public function test_fulfillment_failure_rolls_back_paid_transition_and_credit_balance(): void
    {
        $user = User::factory()->create(['balance' => 0]);
        $this->createPendingPayment($user, [
            'amount' => 100.00,
            'description' => '100 Créditos Mercasto',
            'product_code' => 'credits_100',
        ]);

        Http::fake([
            $this->clipStatusUrl() => Http::response(
                $this->completedCheckoutResponse(['amount' => 100.00]),
                200
            ),
        ]);
        Schema::drop('user_notifications');

        $this->withoutExceptionHandling();
        try {
            $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload());
            $this->fail('Expected fulfillment database failure was not raised.');
        } catch (\Throwable $exception) {
            $this->assertStringContainsString('user_notifications', $exception->getMessage());
        }

        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'pending',
        ]);
        $this->assertSame(0.0, (float) DB::table('users')->where('id', $user->id)->value('balance'));
        Http::assertSentCount(1);
    }

    public function test_completed_checkout_with_mismatched_amount_stays_pending(): void
    {
        $user = User::factory()->create();
        $this->createPendingPayment($user);

        Http::fake([
            $this->clipStatusUrl() => Http::response(
                $this->completedCheckoutResponse(['amount' => 20.00]),
                200
            ),
        ]);

        $response = $this->postJson('/api/webhooks/clip', $this->completedWebhookPayload());

        $response->assertStatus(409)->assertJson(['status' => 'verification_mismatch']);
        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('user_notifications', 0);
        Http::assertSentCount(1);
    }

    public function test_refund_notification_cannot_fulfill_checkout(): void
    {
        $user = User::factory()->create();
        $this->createPendingPayment($user);
        Http::fake();

        $payload = $this->completedWebhookPayload([
            'resource' => 'REFUND',
            'resource_status' => 'APPROVED',
        ]);

        $response = $this->postJson('/api/webhooks/clip', $payload);

        // A refund cannot be authenticated by reading a checkout back from
        // Clip, so an unsigned refund notification fails closed.
        $response->assertStatus(401)->assertJson(['status' => 'signature_required']);
        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('user_notifications', 0);
        $this->assertDatabaseCount('payment_refunds', 0);
        Http::assertNothingSent();
    }

    public function test_signed_refund_notification_records_the_refund_without_fulfilling(): void
    {
        $user = User::factory()->create();
        $this->createPendingPayment($user);
        Http::fake();

        $payload = $this->completedWebhookPayload([
            'refund_id' => 'rf_signed_test',
            'resource' => 'REFUND',
            'resource_status' => 'REFUNDED',
            'amount' => 19.00,
        ]);

        $body = (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $response = $this->call('POST', '/api/webhooks/clip', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_CLIP_SIGNATURE' => 'sha256=' . hash_hmac('sha256', $body, 'test-webhook-secret'),
        ], $body);

        // The checkout is still not fulfilled: a pending payment has no
        // captured money to refund, so nothing is applied and nothing is
        // fulfilled.
        $response->assertOk()->assertJson(['status' => 'refund_without_capture']);
        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('payment_refunds', 0);
        $this->assertDatabaseCount('user_notifications', 0);
        Http::assertNothingSent();
    }

    public function test_invalid_optional_signature_is_rejected_before_verification(): void
    {
        $user = User::factory()->create();
        $this->createPendingPayment($user);
        Http::fake();

        $response = $this->withHeader('X-Clip-Signature', 'sha256=invalid')
            ->postJson('/api/webhooks/clip', $this->completedWebhookPayload());

        $response->assertUnauthorized()->assertJson(['status' => 'invalid_signature']);
        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'pending',
        ]);
        $this->assertDatabaseCount('user_notifications', 0);
        Http::assertNothingSent();
    }

    private function createPendingPayment(User $user, array $overrides = []): void
    {
        DB::table('payments')->insert(array_merge([
            'user_id' => $user->id,
            'ad_id' => null,
            'clip_checkout_id' => self::CHECKOUT_ID,
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'amount' => 19.00,
            'description' => 'Webhook contract test',
            'product_code' => null,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }

    private function completedWebhookPayload(array $overrides = []): array
    {
        return array_merge([
            'id' => 'bc631b13-bda7-4473-9181-bc43e04dfa28',
            'api_version' => '1.0',
            'payment_request_id' => self::PAYMENT_REQUEST_ID,
            'transaction_id' => 'd9fc7f11-bcf4-44ea-af49-dbb946911fa8',
            'resource' => 'CHECKOUT',
            'resource_status' => 'COMPLETED',
            'detail_type' => 'Payment Request Completed',
            'attempts' => 1,
            'completed_at' => now()->toIso8601String(),
            'me_reference_id' => self::CHECKOUT_ID,
            'transaction_id' => 'private-transaction-id',
            'issuer' => 'private-bank',
            'last4' => '4242',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'payer' => ['email' => 'private@example.test'],
        ], $overrides);
    }

    private function completedCheckoutResponse(array $overrides = []): array
    {
        return array_merge([
            'payment_request_id' => self::PAYMENT_REQUEST_ID,
            'object_type' => 'payment_link',
            'status' => 'CHECKOUT_COMPLETED',
            'amount' => 19.00,
            'currency' => 'MXN',
            'metadata' => [
                'external_reference' => self::CHECKOUT_ID,
            ],
        ], $overrides);
    }

    private function clipStatusUrl(): string
    {
        return 'https://api.payclip.com/v2/checkout/' . self::PAYMENT_REQUEST_ID;
    }
}
