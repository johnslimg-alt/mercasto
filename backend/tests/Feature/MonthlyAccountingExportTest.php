<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

class MonthlyAccountingExportTest extends TestCase
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
            'clip_payment_request_id' => 'req-'.$sequence,
            'clip_checkout_id' => 'clip_chk-'.$sequence,
            'webhook_payload' => null,
            'created_at' => '2026-08-10 12:00:00',
            'updated_at' => '2026-08-10 12:00:00',
        ], $overrides));
    }

    private function exportCsv(string $month, array $extra = []): string
    {
        $output = storage_path('app/testing-accounting-'.$month.'-'.md5((string) json_encode($extra)).'.csv');

        $exit = Artisan::call('accounting:export-monthly', array_merge([
            '--month' => $month,
            '--format' => 'csv',
            '--output' => $output,
        ], $extra));

        $this->assertSame(0, $exit);
        $this->assertFileExists($output);

        $contents = file_get_contents($output);
        @unlink($output);

        $this->assertIsString($contents);

        return $contents;
    }

    public function test_exports_only_the_requested_month_with_settlement_detail(): void
    {
        $this->createPayment([
            'status' => 'paid',
            'amount' => 350,
            'webhook_payload' => json_encode([
                'event' => 'provider_webhook',
                'recorded_at' => '2026-08-11T09:00:00+00:00',
                'payer' => ['email' => 'payer@example.test'],
            ]),
        ]);
        $this->createPayment(['status' => 'expired', 'amount' => 99, 'product_code' => 'package_impulso']);
        // Outside the requested month.
        $this->createPayment(['status' => 'paid', 'amount' => 999, 'created_at' => '2026-07-05 08:00:00']);

        $contents = $this->exportCsv('2026-08');

        $this->assertStringContainsString(
            'payment_id,status,created_at,settled_at,settled_via,amount,currency,product_code,product_group,'
            .'clip_payment_request_id,listing_reference,user_reference,listing_status,listing_promoted,boost_expires_at,'
            .'funding_source,settlement_class,verified_cash,fee_rate_applied,fee_amount,refunded_amount,refunded_at,net_amount',
            $contents
        );
        $this->assertStringContainsString('350.00', $contents);
        $this->assertStringContainsString('provider_webhook', $contents);
        $this->assertStringContainsString('2026-08-11T09:00:00+00:00', $contents);
        $this->assertStringContainsString('promotion', $contents);
        $this->assertStringContainsString('package', $contents);
        $this->assertStringContainsString('clip_webhook,verified_cash,yes,0.0000,0.00,0.00,,350.00', $contents);
        $this->assertStringContainsString('gross_revenue_verified,,350.00', $contents);
        $this->assertStringContainsString('claimed_unverified,,0.00', $contents);
        $this->assertStringContainsString('internal_balance,,0.00', $contents);
        $this->assertStringContainsString('paid_total_legacy,1,350.00', $contents);
        $this->assertStringContainsString('reported_overstatement_vs_verified,,0.00', $contents);
        $this->assertStringContainsString('refund_tracking,tracked,', $contents);
        $this->assertStringContainsString('fee_tracking,not_configured,', $contents);
        $this->assertStringContainsString('period_key,created_at,', $contents);

        // July payment must not leak into the August export.
        $this->assertStringNotContainsString('999.00', $contents);
        // Privacy: no payer data from the sanitized payload.
        $this->assertStringNotContainsString('payer@example.test', $contents);
    }

    public function test_gross_revenue_counts_only_verified_provider_backed_money(): void
    {
        // Production shapes: a verified Clip webhook, an operator
        // reconciliation note, an internal balance transfer and an
        // unclassifiable legacy row.
        $this->createPayment([
            'status' => 'paid',
            'amount' => 99,
            'clip_checkout_id' => 'clip_verified',
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'clip',
                'event' => 'provider_webhook',
                'provider_status' => 'paid',
                'recorded_at' => '2026-07-29T13:20:07+00:00',
            ]),
        ]);
        $this->createPayment([
            'status' => 'paid',
            'amount' => 99,
            'clip_checkout_id' => 'clip_manual',
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'internal',
                'event' => 'manual_reconciliation',
                'recorded_at' => '2026-07-10T06:21:13+00:00',
            ]),
        ]);
        $this->createPayment([
            'status' => 'paid',
            'amount' => 1499,
            'clip_checkout_id' => 'balance_sentinel',
            'webhook_payload' => json_encode([
                'schema_version' => 1,
                'provider' => 'internal',
                'event' => 'account_balance',
                'recorded_at' => '2026-07-10T16:41:15+00:00',
            ]),
        ]);
        $this->createPayment([
            'status' => 'paid',
            'amount' => 50,
            'clip_checkout_id' => 'legacy-import-9',
            'webhook_payload' => null,
        ]);
        // Not settled: must never count as revenue.
        $this->createPayment(['status' => 'pending', 'amount' => 500]);

        $contents = $this->exportCsv('2026-08');

        $this->assertStringContainsString('gross_revenue_verified,,99.00', $contents);
        $this->assertStringContainsString('claimed_unverified,,99.00', $contents);
        $this->assertStringContainsString('internal_balance,,1499.00', $contents);
        $this->assertStringContainsString('unclassified_settled,,50.00', $contents);
        $this->assertStringContainsString('paid_total_legacy,4,1747.00', $contents);
        $this->assertStringContainsString('reported_overstatement_vs_verified,,1648.00', $contents);
        $this->assertStringContainsString('funding_source:clip_webhook,1,99.00', $contents);
        $this->assertStringContainsString('funding_source:manual_reconciliation,1,99.00', $contents);
        $this->assertStringContainsString('funding_source:internal_balance,1,1499.00', $contents);
        $this->assertStringContainsString('funding_source:unknown,1,50.00', $contents);
        // The pending row is exported but never counted as revenue.
        $this->assertStringContainsString('status:pending,1,500.00', $contents);
        $this->assertStringNotContainsString('gross_revenue_verified,,599.00', $contents);
    }

    public function test_net_revenue_subtracts_refunds_and_configured_fees(): void
    {
        config(['services.clip.fee_rate' => 0.036]);

        $id = $this->createPayment([
            'status' => 'refunded',
            'amount' => 100,
            'clip_checkout_id' => 'clip_refunded',
            'webhook_payload' => json_encode([
                'provider' => 'clip',
                'event' => 'verified_checkout',
                'recorded_at' => '2026-08-02T10:00:00+00:00',
            ]),
        ]);

        DB::table('payments')->where('id', $id)->update([
            'refunded_amount' => 100,
            'refunded_at' => '2026-08-20 11:00:00',
        ]);

        $contents = $this->exportCsv('2026-08');

        $this->assertStringContainsString('gross_revenue_verified,,100.00', $contents);
        // 100.00 * 0.036 = 3.60 fee, 100.00 refunded.
        $this->assertStringContainsString('fee_total_verified,,3.60', $contents);
        $this->assertStringContainsString('refunded_total,0,100.00', $contents);
        $this->assertStringContainsString('net_revenue_verified,,-3.60', $contents);
        $this->assertStringContainsString('fee_tracking,configured,', $contents);
        $this->assertStringContainsString(
            ',clip_webhook,verified_cash,yes,0.0360,3.60,100.00,2026-08-20T11:00:00+00:00,-3.60',
            $contents
        );
    }

    public function test_period_key_settled_at_uses_settlement_date_and_is_opt_in(): void
    {
        // Booked in June, settled in July: the two period keys must disagree.
        $this->createPayment([
            'status' => 'paid',
            'amount' => 249,
            'clip_checkout_id' => 'clip_settled_in_july',
            'created_at' => '2026-06-05 02:14:54',
            'webhook_payload' => json_encode([
                'provider' => 'clip',
                'event' => 'provider_webhook',
                'recorded_at' => '2026-07-02T09:00:00+00:00',
            ]),
        ]);
        // Settled with no provider timestamp: excluded from a settled_at period
        // instead of silently landing in the wrong month.
        $this->createPayment([
            'status' => 'paid',
            'amount' => 77,
            'clip_checkout_id' => 'clip_without_timestamp',
            'created_at' => '2026-07-05 08:00:00',
            'webhook_payload' => json_encode(['provider' => 'internal', 'event' => 'manual_reconciliation']),
        ]);

        $byBooking = $this->exportCsv('2026-07');
        $this->assertStringContainsString('gross_revenue_verified,,0.00', $byBooking);
        $this->assertStringContainsString('claimed_unverified,,77.00', $byBooking);

        $bySettlement = $this->exportCsv('2026-07', ['--period-key' => 'settled_at']);
        $this->assertStringContainsString('gross_revenue_verified,,249.00', $bySettlement);
        $this->assertStringContainsString('period_key,settled_at,', $bySettlement);
        $this->assertStringNotContainsString('77.00', $bySettlement);
    }

    public function test_xlsx_export_writes_ledger_and_summary_sheets(): void
    {
        $output = storage_path('app/testing-accounting-august.xlsx');

        $this->createPayment(['status' => 'paid', 'amount' => 350]);
        $this->createPayment(['status' => 'expired', 'amount' => 100]);

        $exit = Artisan::call('accounting:export-monthly', [
            '--month' => '2026-08',
            '--format' => 'xlsx',
            '--output' => $output,
        ]);

        $this->assertSame(0, $exit);
        $this->assertFileExists($output);

        $reader = IOFactory::createReader('Xlsx');
        $spreadsheet = $reader->load($output);
        $this->assertSame('Ledger', $spreadsheet->getSheet(0)->getTitle());
        $this->assertSame('Summary', $spreadsheet->getSheet(1)->getTitle());
        $this->assertSame('payment_id', $spreadsheet->getSheet(0)->getCell('A1')->getValue());
        $this->assertSame('funding_source', $spreadsheet->getSheet(0)->getCell('P1')->getValue());
        $this->assertSame('status:paid', $spreadsheet->getSheet(1)->getCell('A2')->getValue());
        $spreadsheet->disconnectWorksheets();

        @unlink($output);
    }

    public function test_rejects_invalid_month_format_and_period_key(): void
    {
        $this->assertSame(1, Artisan::call('accounting:export-monthly', ['--month' => '2026-8']));
        $this->assertSame(1, Artisan::call('accounting:export-monthly', ['--format' => 'pdf']));
        $this->assertSame(1, Artisan::call('accounting:export-monthly', ['--period-key' => 'updated_at']));

        $output = storage_path('app/testing-accounting-should-not-exist.csv');
        $this->assertFileDoesNotExist($output);
    }
}
