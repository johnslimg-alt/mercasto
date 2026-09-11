<?php

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

/**
 * Monthly accounting export.
 *
 * The ledger is built from `payments` plus the sanitized webhook metadata that
 * records how a payment was settled. It deliberately exports references only:
 * no payer name, no email and no raw provider payload ever reaches the file.
 *
 * Two facts the finance flow cannot state yet are written into the export
 * instead of being silently omitted:
 *   - Clip refunds are not persisted anywhere, so there is no refund ledger;
 *   - provider fees are not stored, so the fee column is unavailable.
 */
class ExportMonthlyAccounting extends Command
{
    protected $signature = 'accounting:export-monthly
                            {--month= : Month to export as YYYY-MM (defaults to the previous month)}
                            {--format=csv : Output format: csv or xlsx}
                            {--output= : Destination file or directory}';

    protected $description = 'Export the monthly payment ledger (CSV/XLSX) with promotion and settlement detail';

    private const HEADERS = [
        'payment_id',
        'status',
        'created_at',
        'settled_at',
        'settled_via',
        'amount',
        'currency',
        'product_code',
        'product_group',
        'clip_payment_request_id',
        'listing_reference',
        'user_reference',
        'listing_status',
        'listing_promoted',
        'boost_expires_at',
    ];

    public function handle(): int
    {
        $month = (string) ($this->option('month') ?: now()->subMonth()->format('Y-m'));
        if (! preg_match('/^\d{4}-\d{2}$/', $month)) {
            $this->error('--month must be YYYY-MM');

            return self::FAILURE;
        }

        $format = strtolower((string) $this->option('format'));
        if (! in_array($format, ['csv', 'xlsx'], true)) {
            $this->error('--format must be csv or xlsx');

            return self::FAILURE;
        }

        $start = Carbon::createFromFormat('Y-m-d H:i:s', $month . '-01 00:00:00')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $rows = $this->ledgerRows($start, $end);
        $summary = $this->summarize($rows);

        $path = $this->destinationPath($month, $format);
        if ($format === 'csv') {
            $this->writeCsv($path, $rows, $summary);
        } else {
            $this->writeXlsx($path, $rows, $summary);
        }

        $this->line(sprintf(
            'period=%s payments=%d paid=%d paid_amount=%.2f MXN',
            $month,
            $summary['records'],
            $summary['paid_records'],
            $summary['paid_amount']
        ));
        $this->line(sprintf('refunds=%s fees=%s', $summary['refund_tracking'], $summary['fee_tracking']));
        $this->info('ACCOUNTING_EXPORT=' . $path);

        return self::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function ledgerRows(Carbon $start, Carbon $end): array
    {
        $records = DB::table('payments')
            ->leftJoin('ads', 'payments.ad_id', '=', 'ads.id')
            ->where('payments.created_at', '>=', $start)
            ->where('payments.created_at', '<=', $end)
            ->orderBy('payments.created_at')
            ->orderBy('payments.id')
            ->select([
                'payments.id',
                'payments.status',
                'payments.amount',
                'payments.product_code',
                'payments.created_at',
                'payments.clip_payment_request_id',
                'payments.user_id',
                'payments.ad_id',
                'payments.webhook_payload',
                'ads.status as listing_status',
                'ads.promoted as listing_promoted',
                'ads.boost_expires_at as boost_expires_at',
            ])
            ->get();

        $rows = [];
        foreach ($records as $record) {
            $metadata = $this->settlementMetadata($record->webhook_payload ?? null);
            $isPaid = in_array((string) $record->status, ['paid', 'paid_review'], true);

            $rows[] = [
                'payment_id' => (int) $record->id,
                'status' => (string) $record->status,
                'created_at' => $record->created_at ? (string) $record->created_at : '',
                'settled_at' => $isPaid ? (string) ($metadata['recorded_at'] ?? '') : '',
                'settled_via' => $isPaid ? (string) ($metadata['event'] ?? '') : '',
                'amount' => number_format((float) $record->amount, 2, '.', ''),
                'currency' => 'MXN',
                'product_code' => (string) ($record->product_code ?? ''),
                'product_group' => $this->productGroup($record->product_code),
                'clip_payment_request_id' => (string) ($record->clip_payment_request_id ?? ''),
                'listing_reference' => $record->ad_id !== null ? 'ad:' . $record->ad_id : '',
                'user_reference' => $record->user_id !== null ? 'user:' . $record->user_id : '',
                'listing_status' => (string) ($record->listing_status ?? ''),
                'listing_promoted' => (string) ($record->listing_promoted ?? ''),
                'boost_expires_at' => $record->boost_expires_at ? (string) $record->boost_expires_at : '',
            ];
        }

        return $rows;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<string, mixed>
     */
    private function summarize(array $rows): array
    {
        $byStatus = [];
        $byGroup = [];
        $paidRecords = 0;
        $paidAmount = 0.0;

        foreach ($rows as $row) {
            $status = (string) $row['status'];
            $amount = (float) $row['amount'];
            $byStatus[$status]['records'] = ($byStatus[$status]['records'] ?? 0) + 1;
            $byStatus[$status]['amount'] = round(($byStatus[$status]['amount'] ?? 0) + $amount, 2);

            if (in_array($status, ['paid', 'paid_review'], true)) {
                $paidRecords++;
                $paidAmount += $amount;
                $group = (string) $row['product_group'];
                $byGroup[$group]['records'] = ($byGroup[$group]['records'] ?? 0) + 1;
                $byGroup[$group]['amount'] = round(($byGroup[$group]['amount'] ?? 0) + $amount, 2);
            }
        }

        return [
            'records' => count($rows),
            'paid_records' => $paidRecords,
            'paid_amount' => round($paidAmount, 2),
            'by_status' => $byStatus,
            'paid_by_product_group' => $byGroup,
            'currency' => 'MXN',
            'refund_tracking' => 'not_configured',
            'fee_tracking' => 'not_stored',
        ];
    }

    /**
     * @return array{event?: string|null, recorded_at?: string|null}
     */
    private function settlementMetadata(mixed $payload): array
    {
        if (! is_string($payload) || $payload === '') {
            return [];
        }

        $decoded = json_decode($payload, true);
        if (! is_array($decoded)) {
            return [];
        }

        return [
            'event' => isset($decoded['event']) && is_string($decoded['event']) ? $decoded['event'] : null,
            'recorded_at' => isset($decoded['recorded_at']) && is_string($decoded['recorded_at'])
                ? $decoded['recorded_at']
                : null,
        ];
    }

    private function productGroup(?string $code): string
    {
        $code = (string) $code;

        foreach (['boost_', 'highlight_', 'featured_', 'top_category_', 'ad_renewal_'] as $prefix) {
            if (str_starts_with($code, $prefix)) {
                return 'promotion';
            }
        }

        if (str_starts_with($code, 'credits_')) {
            return 'credits';
        }

        if (str_starts_with($code, 'package_')) {
            return 'package';
        }

        return $code === '' ? 'unknown' : 'other';
    }

    private function destinationPath(string $month, string $format): string
    {
        $output = (string) ($this->option('output') ?? '');
        $defaultDir = storage_path('app/accounting');

        if ($output === '') {
            if (! is_dir($defaultDir)) {
                mkdir($defaultDir, 0700, true);
            }

            return $defaultDir . '/mercasto-accounting-' . $month . '.' . $format;
        }

        if (is_dir($output)) {
            return rtrim($output, '/') . '/mercasto-accounting-' . $month . '.' . $format;
        }

        $directory = dirname($output);
        if ($directory !== '' && ! is_dir($directory)) {
            mkdir($directory, 0700, true);
        }

        return $output;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, mixed>  $summary
     */
    private function writeCsv(string $path, array $rows, array $summary): void
    {
        $handle = fopen($path, 'wb');
        if ($handle === false) {
            throw new \RuntimeException('cannot open ' . $path . ' for writing');
        }

        fputcsv($handle, self::HEADERS);
        foreach ($rows as $row) {
            fputcsv($handle, array_map(
                static fn (string $header) => $row[$header] ?? '',
                self::HEADERS
            ));
        }

        fputcsv($handle, []);
        fputcsv($handle, ['# summary']);
        foreach ($summary['by_status'] as $status => $values) {
            fputcsv($handle, ['status', $status, $values['records'], number_format($values['amount'], 2, '.', '')]);
        }
        foreach ($summary['paid_by_product_group'] as $group => $values) {
            fputcsv($handle, ['paid_group', $group, $values['records'], number_format($values['amount'], 2, '.', '')]);
        }
        fputcsv($handle, ['paid_total', '', $summary['paid_records'], number_format($summary['paid_amount'], 2, '.', '')]);
        fputcsv($handle, ['refund_tracking', $summary['refund_tracking']]);
        fputcsv($handle, ['fee_tracking', $summary['fee_tracking']]);

        fclose($handle);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, mixed>  $summary
     */
    private function writeXlsx(string $path, array $rows, array $summary): void
    {
        $spreadsheet = new Spreadsheet();
        $ledger = $spreadsheet->getActiveSheet();
        $ledger->setTitle('Ledger');
        $ledger->fromArray(self::HEADERS, null, 'A1');

        $line = 2;
        foreach ($rows as $row) {
            $ledger->fromArray(array_map(
                static fn (string $header) => $row[$header] ?? '',
                self::HEADERS
            ), null, 'A' . $line);
            $line++;
        }
        foreach (range('A', 'O') as $column) {
            $ledger->getColumnDimension($column)->setAutoSize(true);
        }

        $summarySheet = $spreadsheet->createSheet();
        $summarySheet->setTitle('Summary');
        $summarySheet->fromArray(['key', 'value', 'records', 'amount'], null, 'A1');
        $summaryLine = 2;
        foreach ($summary['by_status'] as $status => $values) {
            $summarySheet->fromArray(
                ['status', $status, $values['records'], $values['amount']],
                null,
                'A' . $summaryLine++
            );
        }
        foreach ($summary['paid_by_product_group'] as $group => $values) {
            $summarySheet->fromArray(
                ['paid_group', $group, $values['records'], $values['amount']],
                null,
                'A' . $summaryLine++
            );
        }
        $summarySheet->fromArray(['paid_total', '', $summary['paid_records'], $summary['paid_amount']], null, 'A' . $summaryLine++);
        $summarySheet->fromArray(['refund_tracking', $summary['refund_tracking'], '', ''], null, 'A' . $summaryLine++);
        $summarySheet->fromArray(['fee_tracking', $summary['fee_tracking'], '', ''], null, 'A' . $summaryLine++);
        foreach (range('A', 'D') as $column) {
            $summarySheet->getColumnDimension($column)->setAutoSize(true);
        }

        (new Xlsx($spreadsheet))->save($path);
        $spreadsheet->disconnectWorksheets();
    }
}
