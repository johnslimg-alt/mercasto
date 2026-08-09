<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
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

        $response->assertOk()->assertJson(['status' => 'received']);
        $this->assertDatabaseHas('payments', [
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'status' => 'pending',
        ]);
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
