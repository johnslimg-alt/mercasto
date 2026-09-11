<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
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
            'clip_payment_request_id' => 'req-' . $sequence,
            'clip_checkout_id' => 'chk-' . $sequence,
            'webhook_payload' => null,
            'created_at' => '2026-08-10 12:00:00',
            'updated_at' => '2026-08-10 12:00:00',
        ], $overrides));
    }

    public function test_exports_only_the_requested_month_with_settlement_detail(): void
    {
        $output = storage_path('app/testing-accounting-august.csv');

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

        $exit = Artisan::call('accounting:export-monthly', [
            '--month' => '2026-08',
            '--format' => 'csv',
            '--output' => $output,
        ]);

        $this->assertSame(0, $exit);
        $this->assertFileExists($output);

        $contents = file_get_contents($output);
        $this->assertIsString($contents);
        $this->assertStringContainsString('payment_id,status,created_at,settled_at,settled_via', $contents);
        $this->assertStringContainsString('350.00', $contents);
        $this->assertStringContainsString('provider_webhook', $contents);
        $this->assertStringContainsString('2026-08-11T09:00:00+00:00', $contents);
        $this->assertStringContainsString('promotion', $contents);
        $this->assertStringContainsString('package', $contents);
        $this->assertStringContainsString('paid_total,,1,350.00', $contents);
        $this->assertStringContainsString('refund_tracking,not_configured', $contents);
        $this->assertStringContainsString('fee_tracking,not_stored', $contents);

        // July payment must not leak into the August export.
        $this->assertStringNotContainsString('999.00', $contents);
        // Privacy: no payer data from the sanitized payload.
        $this->assertStringNotContainsString('payer@example.test', $contents);

        @unlink($output);
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

        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
        $spreadsheet = $reader->load($output);
        $this->assertSame('Ledger', $spreadsheet->getSheet(0)->getTitle());
        $this->assertSame('Summary', $spreadsheet->getSheet(1)->getTitle());
        $this->assertSame('payment_id', $spreadsheet->getSheet(0)->getCell('A1')->getValue());
        $this->assertSame('status', $spreadsheet->getSheet(1)->getCell('A2')->getValue());
        $spreadsheet->disconnectWorksheets();

        @unlink($output);
    }

    public function test_rejects_invalid_month_and_format(): void
    {
        $this->assertSame(1, Artisan::call('accounting:export-monthly', ['--month' => '2026-8']));
        $this->assertSame(1, Artisan::call('accounting:export-monthly', ['--format' => 'pdf']));

        $output = storage_path('app/testing-accounting-should-not-exist.csv');
        $this->assertFileDoesNotExist($output);
    }
}
