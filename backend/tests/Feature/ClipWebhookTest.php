<?php

namespace Tests\Feature;

use App\Events\NewNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
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
            'title' => '¡Pago exitoso!',
        ]);
        $this->assertDatabaseCount('user_notifications', 1);
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

    private function createPendingPayment(User $user): void
    {
        DB::table('payments')->insert([
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
        ]);
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
