<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Idempotent backfill for the payments funding ledger.
 *
 * Fill-only by design:
 *   - `funding_source` is written only when it is NULL or the placeholder
 *     `unknown`, so an operator (or the webhook handler) can never have a
 *     classification silently downgraded or replaced;
 *   - rows with `funding_source_locked = true` are skipped entirely;
 *   - `settled_at`, `fee_amount`, `fee_rate_applied` and `net_amount` are
 *     filled only when NULL, so re-running never restates a number that has
 *     already been reported to finance;
 *   - `refunded_amount` is owned by the refund ledger (`payment_refunds`) and
 *     is never rewritten here.
 *
 * Running it twice produces zero additional updates, which is what the
 * migration and the tests assert.
 */
final class PaymentLedgerBackfill
{
    public const ROWS_PER_CHUNK = 200;

    /**
     * @return array{scanned: int, updated: int, skipped_locked: int, by_funding_source: array<string, int>}
     */
    public function run(bool $dryRun = false): array
    {
        $stats = [
            'scanned' => 0,
            'updated' => 0,
            'skipped_locked' => 0,
            'by_funding_source' => [],
        ];

        // Nothing to backfill into until the ledger columns exist. Callers must
        // never see a raw SQL error from a money table.
        if (! PaymentLedger::paymentsLedgerReady()) {
            return $stats;
        }

        DB::table('payments')
            ->select([
                'id',
                'clip_checkout_id',
                'status',
                'amount',
                'webhook_payload',
                'funding_source',
                'funding_source_locked',
                'fee_amount',
                'fee_rate_applied',
                'net_amount',
                'refunded_amount',
                'settled_at',
            ])
            ->orderBy('id')
            ->chunkById(self::ROWS_PER_CHUNK, function ($payments) use (&$stats, $dryRun): void {
                foreach ($payments as $payment) {
                    $stats['scanned']++;

                    if ((bool) ($payment->funding_source_locked ?? false)) {
                        $stats['skipped_locked']++;

                        continue;
                    }

                    $updates = $this->plannedUpdates($payment);

                    if ($updates === []) {
                        continue;
                    }

                    $stats['updated']++;
                    $fundingSource = $updates['funding_source'] ?? (string) ($payment->funding_source ?? '');
                    $stats['by_funding_source'][$fundingSource] = ($stats['by_funding_source'][$fundingSource] ?? 0) + 1;

                    if ($dryRun) {
                        continue;
                    }

                    DB::table('payments')
                        ->where('id', $payment->id)
                        ->where('funding_source_locked', false)
                        ->update($updates);
                }
            });

        return $stats;
    }

    /**
     * @return array<string, mixed>
     */
    private function plannedUpdates(object $payment): array
    {
        $amount = (float) $payment->amount;
        $status = (string) $payment->status;
        $settled = PaymentLedger::isSettled($status);
        $current = $payment->funding_source !== null ? (string) $payment->funding_source : null;

        $derived = PaymentLedger::classify(
            $payment->clip_checkout_id ?? null,
            $payment->webhook_payload ?? null,
        );

        $fundingSource = $current;
        $updates = [];

        // Fill-only: never replace a value that is already set, unless the only
        // thing we know is the explicit `unknown` placeholder.
        if ($current === null || $current === PaymentLedger::FUNDING_UNKNOWN) {
            if ($derived !== $current) {
                $updates['funding_source'] = $derived;
                $fundingSource = $derived;
            }
        }

        if ($settled && $payment->settled_at === null) {
            $recordedAt = PaymentLedger::settlementMetadata($payment->webhook_payload ?? null)['recorded_at'];
            if (is_string($recordedAt) && $recordedAt !== '') {
                // `settled_at` in the report is the timestamp recorded inside
                // the sanitized payload. No payload timestamp means the
                // settlement time is genuinely unknown and stays NULL. The
                // value is parsed so the column holds a real timestamp (the ISO
                // string stays available in the payload).
                try {
                    $updates['settled_at'] = Carbon::parse($recordedAt);
                } catch (\Throwable) {
                    // Unparseable provider timestamp: leave settled_at NULL
                    // instead of writing a value that cannot be trusted.
                }
            }
        }

        if ($settled && $payment->fee_amount === null) {
            $updates['fee_rate_applied'] = PaymentLedger::feeRate();
            $updates['fee_amount'] = PaymentLedger::feeAmountFor($fundingSource, $amount);
        }

        if ($settled && $payment->net_amount === null) {
            $fee = (float) ($updates['fee_amount'] ?? $payment->fee_amount ?? 0.0);
            $refunded = (float) ($payment->refunded_amount ?? 0.0);
            $updates['net_amount'] = PaymentLedger::netAmount($amount, $fee, $refunded);
        }

        return $updates;
    }
}
