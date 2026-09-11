<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\PaymentLedger;
use App\Support\PaymentLedgerBackfill;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * The backfill must map every payload shape that exists in production and stay
 * idempotent, because it runs against a money table.
 */
class PaymentFundingLedgerBackfillTest extends TestCase
{
    use RefreshDatabase;

    private function createPayment(array $overrides = []): int
    {
        static $sequence = 0;
        $sequence++;

        return (int) DB::table('payments')->insertGetId(array_merge([
            'user_id' => User::factory()->create()->id,
            'amount' => 99,
            'description' => 'Backfill fixture',
            'status' => 'paid',
            'product_code' => 'package_impulso',
            'clip_checkout_id' => 'clip_fixture-'.$sequence,
            'webhook_payload' => null,
            'created_at' => '2026-07-10 06:10:22',
            'updated_at' => '2026-07-10 06:10:22',
        ], $overrides));
    }

    private function payment(int $id): object
    {
        return DB::table('payments')->where('id', $id)->first();
    }

    public function test_backfill_maps_every_observed_payload_shape(): void
    {
        $providerWebhook = $this->createPayment([
            'amount' => 249,
            'clip_checkout_id' => 'clip_6ead0915-a148-4eae-822c-af6660c68e5c',
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'clip',
                'event' => 'provider_webhook',
                'provider_status' => 'paid',
                'recorded_at' => '2026-06-10T22:26:23+00:00',
            ]),
        ]);

        $manual = $this->createPayment([
            'amount' => 99,
            'clip_checkout_id' => 'clip_16b071cf-d27e-4629-995e-e2bd96409377',
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'internal',
                'event' => 'manual_reconciliation',
                'recorded_at' => '2026-05-31T23:40:25+00:00',
            ]),
        ]);

        $internalBalance = $this->createPayment([
            'amount' => 1499,
            'clip_checkout_id' => 'balance_aaba9d26-8104-44bd-95d8-c8ee64aae561',
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'internal',
                'event' => 'account_balance',
                'recorded_at' => '2026-07-10T16:41:15+00:00',
            ]),
        ]);

        $checkoutOnly = $this->createPayment([
            'amount' => 19,
            'clip_checkout_id' => 'clip_1b9d7910-09b8-4893-872d-7e6a7ca1aa87',
            'webhook_payload' => null,
        ]);

        $unknown = $this->createPayment([
            'amount' => 50,
            'clip_checkout_id' => 'legacy-import-77',
            'webhook_payload' => null,
        ]);

        $expired = $this->createPayment([
            'amount' => 100,
            'status' => 'expired',
            'clip_checkout_id' => 'clip_expired-1',
            'webhook_payload' => null,
        ]);

        $stats = (new PaymentLedgerBackfill)->run();

        $this->assertSame(6, $stats['scanned']);
        $this->assertSame(6, $stats['updated']);

        $this->assertSame('clip_webhook', $this->payment($providerWebhook)->funding_source);
        $this->assertSame('manual_reconciliation', $this->payment($manual)->funding_source);
        $this->assertSame('internal_balance', $this->payment($internalBalance)->funding_source);
        $this->assertSame('clip_checkout', $this->payment($checkoutOnly)->funding_source);
        $this->assertSame('unknown', $this->payment($unknown)->funding_source);
        $this->assertSame('clip_checkout', $this->payment($expired)->funding_source);

        $verified = $this->payment($providerWebhook);
        $this->assertSame('2026-06-10 22:26:23', (string) $verified->settled_at);
        // Numeric columns are compared as numbers: SQLite and Postgres return
        // different string representations for the same decimal value.
        $this->assertSame(0.0, (float) $verified->fee_rate_applied);
        $this->assertSame(0.0, (float) $verified->fee_amount);
        $this->assertSame(249.0, (float) $verified->net_amount);

        // An internal balance transfer carries no Clip fee.
        $this->assertSame(0.0, (float) $this->payment($internalBalance)->fee_amount);
        $this->assertSame(1499.0, (float) $this->payment($internalBalance)->net_amount);

        // Unsettled rows never get fee/net figures.
        $this->assertNull($this->payment($expired)->net_amount);
        $this->assertNull($this->payment($expired)->settled_at);
    }

    public function test_backfill_is_idempotent_and_never_overwrites_a_set_value(): void
    {
        $operatorSet = $this->createPayment([
            'amount' => 99,
            'clip_checkout_id' => 'clip_operator-1',
            'webhook_payload' => json_encode(['provider' => 'internal', 'event' => 'manual_reconciliation']),
            'funding_source' => 'clip_webhook',
            'funding_source_locked' => true,
        ]);

        $alreadyClassified = $this->createPayment([
            'amount' => 99,
            'clip_checkout_id' => 'clip_settled-2',
            'webhook_payload' => json_encode(['provider' => 'clip', 'event' => 'verified_checkout']),
            'funding_source' => 'clip_webhook',
        ]);

        $placeholder = $this->createPayment([
            'amount' => 99,
            'clip_checkout_id' => 'balance_placeholder-3',
            'webhook_payload' => json_encode(['provider' => 'internal', 'event' => 'account_balance']),
            'funding_source' => 'unknown',
        ]);

        $backfill = new PaymentLedgerBackfill;
        $first = $backfill->run();
        $second = $backfill->run();

        // The locked row is skipped entirely; the other two rows only gain the
        // fee/net figures they were missing.
        $this->assertSame(1, $first['skipped_locked']);
        $this->assertSame(2, $first['updated']);
        $this->assertSame(0, $second['updated'], 'A re-run must not change any row.');

        // A locked, manually classified row keeps its value even though the
        // payload says otherwise.
        $this->assertSame('clip_webhook', $this->payment($operatorSet)->funding_source);
        $this->assertSame('clip_webhook', $this->payment($alreadyClassified)->funding_source);
        // The explicit placeholder is the only value that may be replaced.
        $this->assertSame('internal_balance', $this->payment($placeholder)->funding_source);
    }

    public function test_fee_rate_is_a_documented_parameter_not_a_silent_default(): void
    {
        $this->assertSame(0.0, PaymentLedger::feeRate(), 'No Clip fee rate is configured in the repo.');

        $settled = $this->createPayment([
            'amount' => 99,
            'clip_checkout_id' => 'clip_fee-1',
            'webhook_payload' => json_encode([
                'provider' => 'clip',
                'event' => 'provider_webhook',
                'recorded_at' => '2026-07-29T13:20:07+00:00',
            ]),
        ]);

        config(['services.clip.fee_rate' => 0.036]);
        (new PaymentLedgerBackfill)->run();

        $row = $this->payment($settled);
        $this->assertSame(0.036, (float) $row->fee_rate_applied);
        $this->assertSame(3.56, (float) $row->fee_amount);
        $this->assertSame(95.44, (float) $row->net_amount);
    }

    public function test_classify_handles_unknown_and_derived_evidence(): void
    {
        $this->assertSame('clip_webhook', PaymentLedger::classify('clip_x', [
            'provider' => 'clip',
            'event' => 'verified_checkout',
            'provider_status' => 'completed',
        ]));
        $this->assertSame('clip_webhook', PaymentLedger::classify('clip_x', [
            'provider' => 'clip',
            'provider_status' => 'paid',
        ]));
        $this->assertSame('clip_checkout', PaymentLedger::classify('clip_x', [
            'provider' => 'clip',
            'event' => 'checkout_response',
            'provider_status' => 'paid',
        ]));
        $this->assertSame('internal_balance', PaymentLedger::classify('clip_x', [
            'provider' => 'internal',
            'event' => 'account_balance',
        ]));
        $this->assertSame('internal_balance', PaymentLedger::classify('balance_x', null));
        $this->assertSame('manual_reconciliation', PaymentLedger::classify('clip_x', [
            'provider' => 'internal',
            'event' => 'manual_reconciliation',
        ]));
        $this->assertSame('unknown', PaymentLedger::classify('legacy-1', null));
        $this->assertSame('unknown', PaymentLedger::classify('legacy-1', 'not-json'));
        $this->assertSame('clip_checkout', PaymentLedger::classify('clip_x', null));

        // Reporting buckets.
        $this->assertSame('verified_cash', PaymentLedger::settlementClass('paid', 'clip_webhook'));
        $this->assertSame('claimed_unverified', PaymentLedger::settlementClass('paid', 'manual_reconciliation'));
        $this->assertSame('internal_balance', PaymentLedger::settlementClass('paid', 'internal_balance'));
        $this->assertSame('not_settled', PaymentLedger::settlementClass('pending', 'clip_webhook'));
        $this->assertSame('not_settled', PaymentLedger::settlementClass('expired', 'clip_checkout'));
    }
}
