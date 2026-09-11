<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Refund notifications used to be discarded before they could reach a payment,
 * so no refund was ever persisted. These tests pin the new behaviour: exactly
 * one refund record per provider event, folded into the payment exactly once,
 * and never used to fulfill a checkout.
 */
class PaymentRefundLedgerTest extends TestCase
{
    use RefreshDatabase;

    private const PAYMENT_REQUEST_ID = 'e1961597-eccd-4bf5-94f3-c343d529caaa';

    private const CHECKOUT_ID = 'clip_0b05056d-1f2b-4af9-913d-653197b0b0a6';

    private const REFUND_ID = 'rf_8f14e45f-ceea-467a-9a1c-0d5fbbd1eb0a';

    private const WEBHOOK_SECRET = 'test-webhook-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.clip.api_key' => 'test-api-key',
            'services.clip.api_secret' => 'test-api-secret',
            'services.clip.webhook_secret' => self::WEBHOOK_SECRET,
        ]);

        Event::fake([NewNotification::class]);
        Http::preventStrayRequests();
    }

    private function createPaidPayment(array $overrides = []): int
    {
        return (int) DB::table('payments')->insertGetId(array_merge([
            'user_id' => User::factory()->create()->id,
            'clip_checkout_id' => self::CHECKOUT_ID,
            'clip_payment_request_id' => self::PAYMENT_REQUEST_ID,
            'amount' => 249.00,
            'description' => 'Plan Negocio',
            'product_code' => 'package_negocio',
            'status' => 'paid',
            'funding_source' => 'clip_webhook',
            'settled_at' => '2026-06-10 22:26:23',
            'fee_rate_applied' => 0,
            'fee_amount' => 0,
            'net_amount' => 249.00,
            'refunded_amount' => 0,
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'clip',
                'event' => 'provider_webhook',
                'provider_status' => 'paid',
                'recorded_at' => '2026-06-10T22:26:23+00:00',
            ]),
            'created_at' => '2026-06-05 02:14:54',
            'updated_at' => '2026-06-10 22:26:23',
        ], $overrides));
    }

    private function refundPayload(array $overrides = []): array
    {
        return array_merge([
            'api_version' => '1.0',
            'payment_request_id' => self::PAYMENT_REQUEST_ID,
            'me_reference_id' => self::CHECKOUT_ID,
            'refund_id' => self::REFUND_ID,
            'resource' => 'REFUND',
            'resource_status' => 'REFUNDED',
            'amount' => 249.00,
            'completed_at' => '2026-09-01T10:00:00+00:00',
        ], $overrides);
    }

    /**
     * Post a webhook body with a valid HMAC signature, exactly as Clip's
     * signed delivery does.
     */
    private function postSigned(array $payload)
    {
        $body = (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return $this->call('POST', '/api/webhooks/clip', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_CLIP_SIGNATURE' => 'sha256='.hash_hmac('sha256', $body, self::WEBHOOK_SECRET),
        ], $body);
    }

    public function test_refund_webhook_creates_exactly_one_record_and_does_not_double_count(): void
    {
        $paymentId = $this->createPaidPayment();

        $first = $this->postSigned($this->refundPayload());
        $retry = $this->postSigned($this->refundPayload());

        $first->assertOk()->assertJson(['status' => 'received']);
        $retry->assertOk()->assertJson(['status' => 'received']);

        $this->assertDatabaseCount('payment_refunds', 1);
        $this->assertDatabaseHas('payment_refunds', [
            'payment_id' => $paymentId,
            'provider' => 'clip',
            'provider_refund_id' => 'clip:'.self::REFUND_ID,
            'state' => 'refunded',
            'currency' => 'MXN',
        ]);

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('refunded', $payment->status);
        $this->assertSame(249.0, (float) $payment->refunded_amount);
        $this->assertSame(0.0, (float) $payment->net_amount);
        $this->assertNotNull($payment->refunded_at);
        $this->assertSame('2026-09-01 10:00:00', (string) $payment->refunded_at);
        // The Clip-funded provenance is untouched by a refund.
        $this->assertSame('clip_webhook', $payment->funding_source);

        // A refund must never fulfill a checkout or notify the buyer.
        $this->assertDatabaseCount('user_notifications', 0);
        Event::assertNotDispatched(NewNotification::class);
        // No Clip API call is made for a refund notification.
        Http::assertNothingSent();

        // The stored payload keeps references only.
        $stored = (string) DB::table('payment_refunds')->value('payload');
        $this->assertStringNotContainsString('4242', $stored);
        $this->assertSame([
            'schema_version', 'provider', 'event', 'resource', 'provider_status', 'recorded_at',
        ], array_keys((array) json_decode($stored, true)));
    }

    public function test_partial_refunds_accumulate_without_exceeding_the_charge(): void
    {
        $paymentId = $this->createPaidPayment();

        $this->postSigned($this->refundPayload([
            'refund_id' => 'rf_partial_one',
            'amount' => 100.00,
        ]))->assertOk();

        $partial = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('partially_refunded', $partial->status);
        $this->assertSame(100.0, (float) $partial->refunded_amount);
        $this->assertSame(149.0, (float) $partial->net_amount);

        $this->postSigned($this->refundPayload([
            'refund_id' => 'rf_partial_two',
            'amount' => 149.00,
        ]))->assertOk();

        $settled = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('refunded', $settled->status);
        $this->assertSame(249.0, (float) $settled->refunded_amount);
        $this->assertSame(0.0, (float) $settled->net_amount);
        $this->assertDatabaseCount('payment_refunds', 2);
    }

    public function test_oversized_refund_is_clamped_to_the_original_charge(): void
    {
        $paymentId = $this->createPaidPayment();

        $this->postSigned($this->refundPayload([
            'refund_id' => 'rf_oversized',
            'amount' => 99999.00,
        ]))->assertOk();

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame(249.0, (float) $payment->refunded_amount);
        $this->assertSame('refunded', $payment->status);
    }

    public function test_pending_refund_is_recorded_once_and_applied_when_it_becomes_terminal(): void
    {
        $paymentId = $this->createPaidPayment();

        $this->postSigned($this->refundPayload([
            'resource_status' => 'REFUND_PENDING',
            'completed_at' => null,
        ]))->assertOk();

        $pending = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('paid', $pending->status);
        $this->assertSame(0.0, (float) $pending->refunded_amount);
        $this->assertSame(1, DB::table('payment_refunds')->whereNull('applied_at')->count());

        // The same refund id, now terminal: the existing record is upgraded,
        // not duplicated.
        $this->postSigned($this->refundPayload())->assertOk();

        $applied = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('refunded', $applied->status);
        $this->assertSame(249.0, (float) $applied->refunded_amount);
        $this->assertDatabaseCount('payment_refunds', 1);
        $this->assertSame(0, DB::table('payment_refunds')->whereNull('applied_at')->count());
    }

    public function test_dispute_notification_is_recorded_as_a_dispute(): void
    {
        $paymentId = $this->createPaidPayment();

        $this->postSigned($this->refundPayload([
            'resource' => 'DISPUTE',
            'resource_status' => 'DISPUTED',
            'refund_id' => null,
            'dispute_id' => 'dp_19f0c0f2',
            'amount' => 249.00,
        ]))->assertOk();

        $this->assertDatabaseHas('payment_refunds', [
            'payment_id' => $paymentId,
            'provider_refund_id' => 'clip:dp_19f0c0f2',
            'state' => 'disputed',
        ]);

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame(249.0, (float) $payment->refunded_amount);
        $this->assertSame('refunded', $payment->status);
    }

    public function test_unsigned_refund_notification_is_rejected_and_changes_nothing(): void
    {
        $paymentId = $this->createPaidPayment();

        $response = $this->postJson('/api/webhooks/clip', $this->refundPayload());

        $response->assertStatus(401)->assertJson(['status' => 'signature_required']);
        $this->assertDatabaseCount('payment_refunds', 0);

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('paid', $payment->status);
        $this->assertSame(0.0, (float) $payment->refunded_amount);
        Http::assertNothingSent();
    }

    public function test_refund_for_an_unsettled_payment_is_not_applied(): void
    {
        $paymentId = $this->createPaidPayment([
            'status' => 'pending',
            'webhook_payload' => null,
            'funding_source' => 'clip_checkout',
            'settled_at' => null,
            'net_amount' => null,
        ]);

        $response = $this->postSigned($this->refundPayload());

        $response->assertOk()->assertJson(['status' => 'refund_without_capture']);
        $this->assertDatabaseCount('payment_refunds', 0);

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('pending', $payment->status);
        $this->assertSame(0.0, (float) $payment->refunded_amount);
        $this->assertDatabaseCount('user_notifications', 0);
    }

    public function test_refund_for_a_payment_under_review_keeps_the_review_flag(): void
    {
        $paymentId = $this->createPaidPayment(['status' => 'paid_review']);

        $this->postSigned($this->refundPayload())->assertOk();

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('paid_review', $payment->status);
        $this->assertSame(249.0, (float) $payment->refunded_amount);
    }

    public function test_expire_pending_payments_never_touches_a_refunded_payment(): void
    {
        $paymentId = $this->createPaidPayment();

        $this->postSigned($this->refundPayload())->assertOk();

        $this->artisan('payments:expire-pending', ['--hours' => 1])->assertExitCode(0);

        $payment = DB::table('payments')->where('id', $paymentId)->first();
        $this->assertSame('refunded', $payment->status);
        $this->assertSame(249.0, (float) $payment->refunded_amount);
    }
}
