<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PaymentPayloadSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentPayloadPrivacyTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_sanitizer_keeps_only_operational_metadata(): void
    {
        $safe = PaymentPayloadSanitizer::checkout([
            'status' => 'ACTIVE',
            'object_type' => 'payment_link',
            'payer' => ['email' => 'private@example.test'],
            'metadata' => ['user_id' => '99'],
            'last4' => '4242',
            'transaction_id' => 'secret-transaction-id',
            'payment_request_url' => 'https://provider.example/private',
        ], 201);

        $this->assertSame(1, $safe['schema_version']);
        $this->assertSame('clip', $safe['provider']);
        $this->assertSame('checkout_response', $safe['event']);
        $this->assertSame(201, $safe['http_status']);
        $this->assertSame('active', $safe['provider_status']);
        $this->assertSame('payment_link', $safe['object_type']);
        $this->assertSame([
            'schema_version', 'provider', 'event', 'http_status',
            'provider_status', 'object_type', 'recorded_at',
        ], array_keys($safe));
    }

    public function test_webhook_sanitizer_drops_payment_and_location_details(): void
    {
        $safe = PaymentPayloadSanitizer::webhook([
            'resource' => 'CHECKOUT',
            'resource_status' => 'COMPLETED',
            'payment_request_id' => 'provider-id',
            'transaction_id' => 'transaction-id',
            'issuer' => 'private-bank',
            'last4' => '1234',
            'latitude' => 19.4326,
            'longitude' => -99.1332,
            'payer' => ['phone' => '+5210000000000'],
        ]);

        $this->assertSame([
            'schema_version', 'provider', 'event', 'resource',
            'provider_status', 'recorded_at',
        ], array_keys($safe));
        $this->assertSame('checkout', $safe['resource']);
        $this->assertSame('completed', $safe['provider_status']);
        $this->assertStringNotContainsString('1234', json_encode($safe));
        $this->assertStringNotContainsString('private-bank', json_encode($safe));
        $this->assertStringNotContainsString('transaction-id', json_encode($safe));
    }

    public function test_legacy_internal_payloads_are_reduced_to_safe_events(): void
    {
        $balance = PaymentPayloadSanitizer::legacyWebhook(json_encode([
            'method' => 'account_balance',
            'paid_at' => '2026-08-04T12:00:00-06:00',
            'user_id' => 15,
        ]));
        $manual = PaymentPayloadSanitizer::legacyWebhook(json_encode([
            'manual_reconciliation' => true,
            'last4' => '9876',
            'reconciled_at' => '2026-08-04T12:05:00-06:00',
        ]));

        $this->assertSame('account_balance', $balance['event']);
        $this->assertSame('internal', $balance['provider']);
        $this->assertSame('manual_reconciliation', $manual['event']);
        $this->assertArrayNotHasKey('last4', $manual);
        $this->assertArrayNotHasKey('user_id', $balance);
    }

    public function test_provider_rejection_does_not_return_or_store_raw_response(): void
    {
        config([
            'services.clip.api_key' => 'privacy-test-key',
            'services.clip.api_secret' => 'privacy-test-secret',
            'services.clip.checkout_url' => 'https://clip.example.test/checkout',
        ]);

        Http::fake([
            'https://clip.example.test/checkout' => Http::response([
                'status' => 'REJECTED',
                'payer' => ['email' => 'private@example.test'],
                'last4' => '4242',
                'transaction_id' => 'private-transaction',
            ], 422),
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/payment/clip', [
            'amount' => 100,
            'description' => '100 Créditos Mercasto',
            'product_code' => 'credits_100',
        ])->assertStatus(400)
            ->assertJson([
                'success' => false,
                'message' => 'Error al generar el pago',
            ]);

        $this->assertStringNotContainsString('private@example.test', $response->getContent());
        $this->assertStringNotContainsString('4242', $response->getContent());
        $this->assertStringNotContainsString('private-transaction', $response->getContent());

        $payment = DB::table('payments')->where('user_id', $user->id)->first();
        $storedAudit = json_decode((string) $payment->clip_checkout_response, true);
        $this->assertSame('failed', $payment->status);
        $this->assertNull($payment->clip_payment_request_url);
        $this->assertSame('checkout_rejected', $storedAudit['event']);
        $this->assertSame('rejected', $storedAudit['provider_status']);
        $this->assertStringNotContainsString('private@example.test', json_encode($storedAudit));
    }

    public function test_privacy_migration_sanitizes_legacy_rows_and_terminal_urls(): void
    {
        $user = User::factory()->create();
        $id = DB::table('payments')->insertGetId([
            'user_id' => $user->id,
            'clip_checkout_id' => 'clip-legacy-privacy-test',
            'clip_payment_request_id' => 'request-legacy-privacy-test',
            'clip_payment_request_url' => 'https://provider.example/terminal-link',
            'amount' => 49,
            'description' => 'Legacy privacy test',
            'status' => 'paid',
            'webhook_payload' => json_encode([
                'status' => 'completed',
                'last4' => '1111',
                'issuer' => 'legacy-bank',
                'latitude' => 19.4,
            ]),
            'clip_checkout_response' => json_encode([
                'status' => 'active',
                'payer' => ['email' => 'legacy@example.test'],
                'metadata' => ['user_id' => $user->id],
            ]),
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);

        $migration = require database_path('migrations/2026_08_04_170000_minimize_payment_provider_payloads.php');
        $migration->up();

        $payment = DB::table('payments')->where('id', $id)->first();
        $webhook = json_decode((string) $payment->webhook_payload, true);
        $checkout = json_decode((string) $payment->clip_checkout_response, true);

        $this->assertNull($payment->clip_payment_request_url);
        $this->assertSame('provider_webhook', $webhook['event']);
        $this->assertSame('checkout_response', $checkout['event']);
        $this->assertStringNotContainsString('1111', json_encode($webhook));
        $this->assertStringNotContainsString('legacy-bank', json_encode($webhook));
        $this->assertStringNotContainsString('legacy@example.test', json_encode($checkout));
    }

    public function test_expiring_stale_payment_removes_checkout_url(): void
    {
        $user = User::factory()->create();

        DB::table('payments')->insert([
            'user_id' => $user->id,
            'clip_checkout_id' => 'clip-stale-privacy-test',
            'clip_payment_request_id' => 'request-stale-privacy-test',
            'clip_payment_request_url' => 'https://provider.example/stale-link',
            'amount' => 49,
            'description' => 'Stale privacy test',
            'status' => 'pending',
            'created_at' => now()->subHours(48),
            'updated_at' => now()->subHours(48),
        ]);

        $this->artisan('payments:expire-pending', ['--hours' => 24])
            ->assertSuccessful();

        $this->assertDatabaseHas('payments', [
            'clip_checkout_id' => 'clip-stale-privacy-test',
            'status' => 'expired',
            'clip_payment_request_url' => null,
        ]);
    }
}
