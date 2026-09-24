<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminPaymentReconciliationTest extends TestCase
{
    use RefreshDatabase;

    private function createPayment(array $overrides = []): int
    {
        static $sequence = 0;
        $sequence++;

        return (int) DB::table('payments')->insertGetId(array_merge([
            'user_id' => User::factory()->create()->id,
            'amount' => 350,
            'description' => 'Boost 1 día',
            'status' => 'pending',
            'product_code' => 'boost_1_day',
            'clip_payment_request_id' => 'req-test-' . $sequence,
            'clip_checkout_id' => 'chk-test-' . $sequence,
            'webhook_payload' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ], $overrides));
    }

    public function test_non_admin_cannot_read_reconciliation(): void
    {
        $user = User::factory()->create(['role' => 'individual']);

        $this->actingAs($user)
            ->getJson('/api/admin/payments/reconciliation')
            ->assertForbidden();
    }

    public function test_admin_sees_clip_reference_and_settlement_without_provider_payloads(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $paidId = $this->createPayment([
            'status' => 'paid',
            'amount' => 350,
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'clip',
                'event' => 'provider_webhook',
                'recorded_at' => '2026-06-10T22:26:23+00:00',
                'payer' => ['email' => 'payer@example.test'],
                'last4' => '4242',
            ]),
        ]);
        $expiredId = $this->createPayment([
            'status' => 'expired',
            'amount' => 100,
            'clip_payment_request_id' => 'req-test-2',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/payments/reconciliation');
        $response->assertOk();

        $payload = $response->json();
        $this->assertSame('MXN', $payload['summary']['currency']);
        $this->assertSame('tracked', $payload['summary']['refund_tracking']);
        $this->assertSame(0, $payload['summary']['refund_records']);
        $this->assertSame(2, $payload['summary']['records']);
        $this->assertSame(350.0, (float) $payload['summary']['paid_amount']);
        // Only the provider webhook proves cash; the headline paid amount is
        // reported next to the verified bucket, never instead of it.
        $this->assertSame(350.0, (float) $payload['summary']['verified_cash_amount']);
        $this->assertSame(0.0, (float) $payload['summary']['claimed_unverified_amount']);
        $this->assertSame(0.0, (float) $payload['summary']['internal_balance_amount']);
        $this->assertSame(350.0, (float) $payload['summary']['by_funding_source']['clip_webhook']['amount']);
        $this->assertArrayHasKey('paid', $payload['summary']['by_status']);
        $this->assertArrayHasKey('expired', $payload['summary']['by_status']);
        $this->assertSame(2, $payload['summary']['unmatched_listing_reference']);

        $rows = collect($payload['data'])->keyBy('payment_id');

        $paid = $rows[$paidId];
        $this->assertSame('req-test-1', $paid['clip_payment_request_id']);
        $this->assertSame('chk-test-1', $paid['clip_checkout_id']);
        $this->assertSame('MXN', $paid['currency']);
        $this->assertSame(350.0, (float) $paid['amount']);
        $this->assertSame('provider_webhook', $paid['settled_via']);
        $this->assertSame('2026-06-10T22:26:23+00:00', $paid['settled_at']);
        $this->assertSame('none_recorded', $paid['refund_state']);
        $this->assertSame('clip_webhook', $paid['funding_source']);
        $this->assertSame('verified_cash', $paid['settlement_class']);
        $this->assertTrue($paid['verified_cash']);
        $this->assertSame(0.0, (float) $paid['refunded_amount']);
        $this->assertNull($paid['listing_reference']);
        $this->assertFalse($paid['promotion']['delivered']);

        $expired = $rows[$expiredId];
        $this->assertNull($expired['settled_at']);
        $this->assertNull($expired['settled_via']);
        $this->assertSame('not_settled', $expired['settlement_class']);
        $this->assertFalse($expired['verified_cash']);

        $serialized = json_encode($payload);
        $this->assertStringNotContainsString('payer@example.test', $serialized);
        $this->assertStringNotContainsString('4242', $serialized);
        $this->assertStringNotContainsString('webhook_payload', $serialized);
        $this->assertStringNotContainsString('clip_checkout_response', $serialized);
    }

    public function test_reconciliation_filters_by_status_and_product_code(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->createPayment(['status' => 'paid', 'product_code' => 'boost_1_day']);
        $this->createPayment(['status' => 'expired', 'product_code' => 'boost_1_day']);
        $this->createPayment(['status' => 'paid', 'product_code' => 'package_negocio']);

        $byStatus = $this->actingAs($admin)
            ->getJson('/api/admin/payments/reconciliation?status=paid');
        $byStatus->assertOk();
        $this->assertCount(2, $byStatus->json('data'));

        $byProduct = $this->actingAs($admin)
            ->getJson('/api/admin/payments/reconciliation?product_code=package_negocio');
        $byProduct->assertOk();
        $this->assertCount(1, $byProduct->json('data'));
        $this->assertSame('package_negocio', $byProduct->json('data.0.product_code'));

        $this->actingAs($admin)
            ->getJson('/api/admin/payments/reconciliation?per_page=500')
            ->assertStatus(422);
    }
}
