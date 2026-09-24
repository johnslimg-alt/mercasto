<?php

namespace App\Console\Commands;

use App\Support\PaymentLedger;
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
 * Money rules (previously the report counted every `paid`/`paid_review` row as
 * revenue, which overstated collected cash):
 *   - gross revenue counts only settled, provider-backed money
 *     (`funding_source = clip_webhook`, proven by a verified Clip webhook);
 *   - `claimed_unverified` and `internal_balance` are reported as separate
 *     buckets so a claim can never be read as cash;
 *   - provider fees are not configured anywhere: `CLIP_FEE_RATE` defaults to 0
 *     and the export states that fee tracking is not configured;
 *   - refunds are read from the `payment_refunds` ledger.
 *
 * Period keying: the export still buckets by `created_at` (booking date) by
 * default, so historical numbers do not change silently. `--period-key=settled_at`
 * switches to the settlement date once operators have approved the restatement.
 */
class ExportMonthlyAccounting extends Command
{
    protected $signature = 'accounting:export-monthly
                            {--month= : Month to export as YYYY-MM (defaults to the previous month)}
                            {--format=csv : Output format: csv or xlsx}
                            {--output= : Destination file or directory}
                            {--period-key=created_at : Period column: created_at (booking date) or settled_at (settlement date)}';

    protected $description = 'Export the monthly payment ledger (CSV/XLSX) with funding-source and settlement detail';

    /**
     * The first fifteen columns are unchanged and new columns are appended, so
     * an existing index-based consumer keeps reading the same fields.
     */
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
        'funding_source',
        'settlement_class',
        'verified_cash',
        'fee_rate_applied',
        'fee_amount',
        'refunded_amount',
        'refunded_at',
        'net_amount',
    ];

    private string $periodKey = 'created_at';

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

        $periodKey = strtolower((string) $this->option('period-key'));
        if (! in_array($periodKey, ['created_at', 'settled_at'], true)) {
            $this->error('--period-key must be created_at or settled_at');

            return self::FAILURE;
        }

        $this->periodKey = $periodKey;

        $start = Carbon::createFromFormat('Y-m-d H:i:s', $month.'-01 00:00:00')->startOfMonth();
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
            'period=%s period_key=%s payments=%d settled=%d reported_paid=%.2f verified_cash=%.2f claimed_unverified=%.2f internal_balance=%.2f refunded=%.2f MXN',
            $month,
            $summary['period_key'],
            $summary['records'],
            $summary['settled_records'],
            $summary['paid_amount'],
            $summary['gross_revenue_verified'],
            $summary['claimed_unverified_amount'],
            $summary['internal_balance_amount'],
            $summary['refunded_amount'],
        ));
        $this->line(sprintf('refunds=%s fees=%s', $summary['refund_tracking'], $summary['fee_tracking']));
        $this->info('ACCOUNTING_EXPORT='.$path);

        return self::SUCCESS;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function ledgerRows(Carbon $start, Carbon $end): array
    {
        $ledgerReady = PaymentLedger::paymentsLedgerReady();

        $columns = [
            'payments.id',
            'payments.status',
            'payments.amount',
            'payments.product_code',
            'payments.created_at',
            'payments.clip_checkout_id',
            'payments.clip_payment_request_id',
            'payments.user_id',
            'payments.ad_id',
            'payments.webhook_payload',
            'ads.status as listing_status',
            'ads.promoted as listing_promoted',
            'ads.boost_expires_at as boost_expires_at',
        ];

        if ($ledgerReady) {
            $columns = array_merge($columns, [
                'payments.funding_source',
                'payments.settled_at',
                'payments.fee_rate_applied',
                'payments.fee_amount',
                'payments.net_amount',
                'payments.refunded_amount',
                'payments.refunded_at',
            ]);
        }

        $query = DB::table('payments')
            ->leftJoin('ads', 'payments.ad_id', '=', 'ads.id');

        if ($this->periodKey === 'settled_at') {
            // Settlement-date reporting can only ever contain settled rows.
            // Rows whose `settled_at` column is still empty are read through
            // the payload fallback below, so they are fetched and filtered in
            // PHP rather than silently dropped.
            $query->whereIn('payments.status', PaymentLedger::SETTLED_STATUSES)
                ->where(function ($window) use ($start, $end): void {
                    $window->whereBetween('payments.settled_at', [$start, $end])
                        ->orWhere(function ($fallback) use ($end): void {
                            $fallback->whereNull('payments.settled_at')
                                ->where('payments.created_at', '<=', $end);
                        });
                });

            $settledColumn = 'payments.settled_at';
        } else {
            $query->whereBetween('payments.created_at', [$start, $end]);
            $settledColumn = 'payments.created_at';
        }

        $records = $query
            ->orderBy($settledColumn)
            ->orderBy('payments.id')
            ->select($columns)
            ->get();

        $rows = [];
        foreach ($records as $record) {
            $metadata = PaymentLedger::settlementMetadata($record->webhook_payload ?? null);
            $status = (string) $record->status;
            $amount = (float) $record->amount;
            $settled = PaymentLedger::isSettled($status);
            $isPaid = in_array($status, PaymentLedger::PAID_STATUSES, true);

            // The column is authoritative once the backfill has run; deriving
            // from the payload keeps the export honest during the deploy window
            // and in a dry run against a not-yet-migrated database.
            $fundingSource = $ledgerReady && ! empty($record->funding_source)
                ? (string) $record->funding_source
                : PaymentLedger::classify($record->clip_checkout_id ?? null, $record->webhook_payload ?? null);

            $settledAt = $this->isoTimestamp($metadata['recorded_at'] ?? null);
            if ($ledgerReady && ! empty($record->settled_at)) {
                $settledAt = $this->isoTimestamp((string) $record->settled_at);
            }

            if ($this->periodKey === 'settled_at' && ! $this->withinPeriod($settledAt, $start, $end)) {
                // No settlement timestamp, or settled outside the requested
                // month: never guess a month for money.
                continue;
            }

            $refundedAmount = $ledgerReady ? round((float) ($record->refunded_amount ?? 0.0), 2) : 0.0;
            $fee = $ledgerReady && $record->fee_amount !== null
                ? round((float) $record->fee_amount, 2)
                : ($settled ? PaymentLedger::feeAmountFor($fundingSource, $amount) : null);
            $net = $ledgerReady && $record->net_amount !== null
                ? round((float) $record->net_amount, 2)
                : ($settled ? PaymentLedger::netAmount($amount, (float) $fee, $refundedAmount) : null);

            $rows[] = [
                'payment_id' => (int) $record->id,
                'status' => $status,
                'created_at' => $record->created_at ? (string) $record->created_at : '',
                'settled_at' => $settled && $settledAt ? (string) $settledAt : '',
                'settled_via' => $isPaid ? (string) ($metadata['event'] ?? '') : '',
                'amount' => number_format($amount, 2, '.', ''),
                'currency' => 'MXN',
                'product_code' => (string) ($record->product_code ?? ''),
                'product_group' => $this->productGroup($record->product_code),
                'clip_payment_request_id' => (string) ($record->clip_payment_request_id ?? ''),
                'listing_reference' => $record->ad_id !== null ? 'ad:'.$record->ad_id : '',
                'user_reference' => $record->user_id !== null ? 'user:'.$record->user_id : '',
                'listing_status' => (string) ($record->listing_status ?? ''),
                'listing_promoted' => (string) ($record->listing_promoted ?? ''),
                'boost_expires_at' => $record->boost_expires_at ? (string) $record->boost_expires_at : '',
                'funding_source' => $fundingSource,
                'settlement_class' => PaymentLedger::settlementClass($status, $fundingSource),
                'verified_cash' => ($settled && PaymentLedger::isVerified($fundingSource)) ? 'yes' : 'no',
                'fee_rate_applied' => $ledgerReady && $record->fee_rate_applied !== null
                    ? (string) $record->fee_rate_applied
                    : ($settled ? number_format(PaymentLedger::feeRate(), 4, '.', '') : ''),
                'fee_amount' => $fee === null ? '' : number_format((float) $fee, 2, '.', ''),
                'refunded_amount' => number_format($refundedAmount, 2, '.', ''),
                'refunded_at' => $ledgerReady && ! empty($record->refunded_at)
                    ? (string) $this->isoTimestamp((string) $record->refunded_at)
                    : '',
                'net_amount' => $net === null ? '' : number_format((float) $net, 2, '.', ''),
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
        $byFundingSource = [];
        $paidRecords = 0;
        $paidAmount = 0.0;
        $settledRecords = 0;
        $settledAmount = 0.0;
        $verifiedAmount = 0.0;
        $claimedAmount = 0.0;
        $internalAmount = 0.0;
        $unclassifiedAmount = 0.0;
        $refundedAmount = 0.0;
        $verifiedFees = 0.0;
        $verifiedRefunded = 0.0;

        foreach ($rows as $row) {
            $status = (string) $row['status'];
            $amount = (float) $row['amount'];
            $byStatus[$status]['records'] = ($byStatus[$status]['records'] ?? 0) + 1;
            $byStatus[$status]['amount'] = round(($byStatus[$status]['amount'] ?? 0) + $amount, 2);

            $settled = PaymentLedger::isSettled($status);
            $fundingSource = (string) $row['funding_source'];
            $class = (string) $row['settlement_class'];

            if ($settled) {
                $settledRecords++;
                $settledAmount += $amount;
                $byFundingSource[$fundingSource]['records'] = ($byFundingSource[$fundingSource]['records'] ?? 0) + 1;
                $byFundingSource[$fundingSource]['amount'] = round(($byFundingSource[$fundingSource]['amount'] ?? 0) + $amount, 2);

                match ($class) {
                    'verified_cash' => $verifiedAmount += $amount,
                    'claimed_unverified' => $claimedAmount += $amount,
                    'internal_balance' => $internalAmount += $amount,
                    default => $unclassifiedAmount += $amount,
                };

                if ($class === 'verified_cash') {
                    $verifiedFees += (float) ($row['fee_amount'] === '' ? 0.0 : $row['fee_amount']);
                    $verifiedRefunded += (float) $row['refunded_amount'];
                }
            }

            $refundedAmount += (float) $row['refunded_amount'];

            // Legacy headline: every paid/paid_review row, regardless of how it
            // was funded. Kept so the restatement is measurable, never as the
            // revenue figure.
            if (in_array($status, PaymentLedger::PAID_STATUSES, true)) {
                $paidRecords++;
                $paidAmount += $amount;
                $group = (string) $row['product_group'];
                $byGroup[$group]['records'] = ($byGroup[$group]['records'] ?? 0) + 1;
                $byGroup[$group]['amount'] = round(($byGroup[$group]['amount'] ?? 0) + $amount, 2);
            }
        }

        $refundLedgerReady = PaymentLedger::refundLedgerReady();

        return [
            'records' => count($rows),
            'period_key' => $this->periodKey,
            'paid_records' => $paidRecords,
            'paid_amount' => round($paidAmount, 2),
            'settled_records' => $settledRecords,
            'settled_amount' => round($settledAmount, 2),
            'gross_revenue_verified' => round($verifiedAmount, 2),
            'claimed_unverified_amount' => round($claimedAmount, 2),
            'internal_balance_amount' => round($internalAmount, 2),
            'unclassified_amount' => round($unclassifiedAmount, 2),
            'fee_amount_total' => round($verifiedFees, 2),
            'refunded_amount' => round($refundedAmount, 2),
            'net_revenue_verified' => round($verifiedAmount - $verifiedFees - $verifiedRefunded, 2),
            'reported_overstatement_amount' => round($paidAmount - $verifiedAmount, 2),
            'by_status' => $byStatus,
            'by_funding_source' => $byFundingSource,
            'paid_by_product_group' => $byGroup,
            'currency' => 'MXN',
            'refund_tracking' => $refundLedgerReady ? 'tracked' : 'not_configured',
            'refund_records' => $refundLedgerReady ? (int) DB::table('payment_refunds')->count() : 0,
            'fee_tracking' => PaymentLedger::feeRate() > 0.0 ? 'configured' : 'not_configured',
            'fee_rate' => PaymentLedger::feeRate(),
        ];
    }

    /**
     * Normalize a stored or payload timestamp to ISO-8601 for the export.
     */
    private function isoTimestamp(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toIso8601String();
        } catch (\Throwable) {
            return trim($value);
        }
    }

    private function withinPeriod(?string $value, Carbon $start, Carbon $end): bool
    {
        if ($value === null) {
            return false;
        }

        try {
            $timestamp = Carbon::parse($value);
        } catch (\Throwable) {
            return false;
        }

        return $timestamp->greaterThanOrEqualTo($start) && $timestamp->lessThanOrEqualTo($end);
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

            return $defaultDir.'/mercasto-accounting-'.$month.'.'.$format;
        }

        if (is_dir($output)) {
            return rtrim($output, '/').'/mercasto-accounting-'.$month.'.'.$format;
        }

        $directory = dirname($output);
        if ($directory !== '' && ! is_dir($directory)) {
            mkdir($directory, 0700, true);
        }

        return $output;
    }

    /**
     * Summary lines as [key, records, preformatted amount].
     *
     * @param  array<string, mixed>  $summary
     * @return array<int, array{0: string, 1: int|string, 2: string}>
     */
    private function summaryLines(array $summary): array
    {
        $lines = [];

        foreach ($summary['by_status'] as $status => $values) {
            $lines[] = ['status:'.$status, $values['records'], $this->money($values['amount'])];
        }

        foreach ($summary['by_funding_source'] as $source => $values) {
            $lines[] = ['funding_source:'.$source, $values['records'], $this->money($values['amount'])];
        }

        foreach ($summary['paid_by_product_group'] as $group => $values) {
            $lines[] = ['paid_group:'.$group, $values['records'], $this->money($values['amount'])];
        }

        $lines[] = ['total_records', $summary['records'], $this->money($summary['settled_amount'])];
        $lines[] = ['settled_total', $summary['settled_records'], $this->money($summary['settled_amount'])];
        $lines[] = ['gross_revenue_verified', '', $this->money($summary['gross_revenue_verified'])];
        $lines[] = ['claimed_unverified', '', $this->money($summary['claimed_unverified_amount'])];
        $lines[] = ['internal_balance', '', $this->money($summary['internal_balance_amount'])];
        $lines[] = ['unclassified_settled', '', $this->money($summary['unclassified_amount'])];
        $lines[] = ['refunded_total', $summary['refund_records'], $this->money($summary['refunded_amount'])];
        $lines[] = ['fee_total_verified', '', $this->money($summary['fee_amount_total'])];
        $lines[] = ['net_revenue_verified', '', $this->money($summary['net_revenue_verified'])];
        // The legacy figure that used to be the reported revenue.
        $lines[] = ['paid_total_legacy', $summary['paid_records'], $this->money($summary['paid_amount'])];
        $lines[] = ['reported_overstatement_vs_verified', '', $this->money($summary['reported_overstatement_amount'])];
        // Rates are fractions, not money: four decimals, never rounded to cents.
        $lines[] = ['fee_rate_applied', '', number_format($summary['fee_rate'], 4, '.', '')];
        $lines[] = ['period_key', $summary['period_key'], ''];
        $lines[] = ['refund_tracking', $summary['refund_tracking'], ''];
        $lines[] = ['fee_tracking', $summary['fee_tracking'], ''];

        return $lines;
    }

    private function money(float|int|string $value): string
    {
        return number_format((float) $value, 2, '.', '');
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, mixed>  $summary
     */
    private function writeCsv(string $path, array $rows, array $summary): void
    {
        $handle = fopen($path, 'wb');
        if ($handle === false) {
            throw new \RuntimeException('cannot open '.$path.' for writing');
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
        foreach ($this->summaryLines($summary) as [$key, $records, $amount]) {
            fputcsv($handle, [$key, $records, $amount]);
        }

        fclose($handle);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<string, mixed>  $summary
     */
    private function writeXlsx(string $path, array $rows, array $summary): void
    {
        $spreadsheet = new Spreadsheet;
        $ledger = $spreadsheet->getActiveSheet();
        $ledger->setTitle('Ledger');
        $ledger->fromArray(self::HEADERS, null, 'A1');

        $line = 2;
        foreach ($rows as $row) {
            $ledger->fromArray(array_map(
                static fn (string $header) => $row[$header] ?? '',
                self::HEADERS
            ), null, 'A'.$line);
            $line++;
        }
        foreach (range('A', 'W') as $column) {
            $ledger->getColumnDimension($column)->setAutoSize(true);
        }

        $summarySheet = $spreadsheet->createSheet();
        $summarySheet->setTitle('Summary');
        $summarySheet->fromArray(['key', 'records', 'amount'], null, 'A1');
        $summaryLine = 2;
        foreach ($this->summaryLines($summary) as [$key, $records, $amount]) {
            $summarySheet->fromArray([$key, $records, $amount], null, 'A'.$summaryLine++);
        }
        foreach (range('A', 'C') as $column) {
            $summarySheet->getColumnDimension($column)->setAutoSize(true);
        }

        (new Xlsx($spreadsheet))->save($path);
        $spreadsheet->disconnectWorksheets();
    }
}
