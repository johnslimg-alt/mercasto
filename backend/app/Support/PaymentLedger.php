<?php

namespace App\Support;

use Illuminate\Support\Facades\Schema;

/**
 * Funding-ledger vocabulary for the `payments` table.
 *
 * `status = paid` alone cannot tell finance whether money actually arrived.
 * A row can be closed by a verified Clip webhook (real card cash), by an
 * operator reconciliation note (no provider proof), by an internal account
 * balance transfer (no external cash at settlement time) or by nothing at all.
 * This class is the single place where that distinction is derived, so the
 * migration backfill, the webhook handler and the accounting export can never
 * disagree about what a payment was funded with.
 */
final class PaymentLedger
{
    /**
     * Deploy-order guard. The release pipeline restarts containers before it
     * runs `php artisan migrate --force`, so for a short window the new code
     * can run against the old money-table schema. Payment writes must degrade
     * to the previous behaviour instead of throwing on a missing column.
     *
     * @var array<string, bool>|null
     */
    private static ?array $schemaReady = null;

    public const FUNDING_CLIP_CHECKOUT = 'clip_checkout';

    public const FUNDING_CLIP_WEBHOOK = 'clip_webhook';

    public const FUNDING_INTERNAL_BALANCE = 'internal_balance';

    public const FUNDING_MANUAL_RECONCILIATION = 'manual_reconciliation';

    public const FUNDING_UNKNOWN = 'unknown';

    /** @var array<int, string> */
    public const FUNDING_SOURCES = [
        self::FUNDING_CLIP_CHECKOUT,
        self::FUNDING_CLIP_WEBHOOK,
        self::FUNDING_INTERNAL_BALANCE,
        self::FUNDING_MANUAL_RECONCILIATION,
        self::FUNDING_UNKNOWN,
    ];

    /**
     * Local statuses that mean the payment closed: money was charged, a
     * provider decision was recorded, or a refund closed the record. Pending,
     * expired and failed rows are not settled and must never count as revenue.
     *
     * @var array<int, string>
     */
    public const SETTLED_STATUSES = [
        'paid',
        'paid_review',
        'refunded',
        'partially_refunded',
    ];

    /** Statuses the legacy reports counted as revenue/paid. */
    public const PAID_STATUSES = ['paid', 'paid_review'];

    /** Statuses that mean at least one applied refund closed the payment. */
    public const REFUNDED_STATUSES = ['refunded', 'partially_refunded'];

    /**
     * Only a verified provider webhook proves external cash. Everything else is
     * a claim (operator note, checkout id without provider proof) or internal
     * money that never entered through this payment row.
     *
     * @var array<int, string>
     */
    public const VERIFIED_FUNDING_SOURCES = [self::FUNDING_CLIP_WEBHOOK];

    /**
     * Provider statuses that prove a completed checkout in a webhook body.
     *
     * @var array<int, string>
     */
    private const PAID_EVIDENCE_STATUSES = [
        'paid',
        'approved',
        'succeeded',
        'success',
        'completed',
        'checkout_completed',
        'payment_completed',
    ];

    /** Webhook event names written by the Clip settlement path. */
    private const PROVIDER_WEBHOOK_EVENTS = ['provider_webhook', 'verified_checkout', 'webhook'];

    /**
     * Derive the funding source from the checkout id prefix plus the sanitized
     * webhook payload. Returns one of self::FUNDING_SOURCES.
     */
    public static function classify(?string $checkoutId, mixed $payload): string
    {
        $checkoutId = (string) ($checkoutId ?? '');
        $metadata = self::settlementMetadata($payload);
        $event = $metadata['event'];
        $provider = $metadata['provider'];
        $providerStatus = $metadata['provider_status'];

        // The balance_ prefix is written only by the internal account-balance
        // payment path, so it is the strongest possible signal.
        if (str_starts_with($checkoutId, 'balance_')) {
            return self::FUNDING_INTERNAL_BALANCE;
        }

        if ($event !== null) {
            if (str_contains($event, 'account_balance')) {
                return self::FUNDING_INTERNAL_BALANCE;
            }

            if (str_contains($event, 'manual') || str_contains($event, 'reconcil')) {
                return self::FUNDING_MANUAL_RECONCILIATION;
            }

            if (in_array($event, self::PROVIDER_WEBHOOK_EVENTS, true)) {
                return self::FUNDING_CLIP_WEBHOOK;
            }
        }

        // A Clip-attributed payload that carries a paid provider status is
        // provider proof even when the event label is unfamiliar. Checkout
        // creation responses are not settlement evidence and are excluded.
        if ($provider === 'clip'
            && $providerStatus !== null
            && in_array($providerStatus, self::PAID_EVIDENCE_STATUSES, true)
            && ! in_array($event, ['checkout_response', 'checkout_rejected'], true)) {
            return self::FUNDING_CLIP_WEBHOOK;
        }

        if (str_starts_with($checkoutId, 'clip_')) {
            return self::FUNDING_CLIP_CHECKOUT;
        }

        return self::FUNDING_UNKNOWN;
    }

    public static function isSettled(mixed $status): bool
    {
        return in_array((string) $status, self::SETTLED_STATUSES, true);
    }

    public static function isVerified(?string $fundingSource): bool
    {
        return in_array((string) $fundingSource, self::VERIFIED_FUNDING_SOURCES, true);
    }

    /**
     * Reporting bucket for a settled row. Unsettled rows return 'not_settled'.
     */
    public static function settlementClass(mixed $status, ?string $fundingSource): string
    {
        if (! self::isSettled($status)) {
            return 'not_settled';
        }

        return match ($fundingSource) {
            self::FUNDING_CLIP_WEBHOOK => 'verified_cash',
            self::FUNDING_INTERNAL_BALANCE => 'internal_balance',
            self::FUNDING_CLIP_CHECKOUT, self::FUNDING_MANUAL_RECONCILIATION => 'claimed_unverified',
            default => 'unclassified',
        };
    }

    /**
     * Clip processing fee rate applied to provider-backed cash.
     *
     * NO Clip fee rate is configured anywhere in this repository and no
     * merchant contract rate is stored, so the default is 0.0000 and the
     * accounting export reports fee tracking as not configured. An operator
     * must set CLIP_FEE_RATE (fraction, e.g. 0.036 for 3.6%) from the signed
     * Clip merchant contract before fee/net columns mean anything.
     */
    public static function feeRate(): float
    {
        $rate = config('services.clip.fee_rate');

        if (! is_numeric($rate)) {
            return 0.0;
        }

        $rate = (float) $rate;

        // A fraction outside 0..1 is a misconfiguration, never a silent fee.
        return ($rate >= 0.0 && $rate <= 1.0) ? $rate : 0.0;
    }

    /**
     * Fees are only charged by Clip on money that actually moved through Clip.
     * Internal balance transfers and operator reconciliation notes carry no
     * new gateway fee at settlement time.
     */
    public static function feeAmountFor(?string $fundingSource, float $amount): float
    {
        if ($fundingSource !== self::FUNDING_CLIP_WEBHOOK || $amount <= 0.0) {
            return 0.0;
        }

        return round($amount * self::feeRate(), 2);
    }

    /**
     * net_amount = amount - fee_amount - refunded_amount.
     *
     * Clip does not return its commission on a refund, so the fee is kept for
     * refunded rows. This is the documented assumption, not a measured fact.
     */
    public static function netAmount(float $amount, float $feeAmount, float $refundedAmount): float
    {
        return round($amount - $feeAmount - $refundedAmount, 2);
    }

    /**
     * Read only the operational settlement metadata out of a sanitized payload.
     *
     * @return array{event: ?string, provider: ?string, provider_status: ?string, recorded_at: ?string}
     */
    public static function settlementMetadata(mixed $payload): array
    {
        $empty = [
            'event' => null,
            'provider' => null,
            'provider_status' => null,
            'recorded_at' => null,
        ];

        if (is_string($payload)) {
            if (trim($payload) === '') {
                return $empty;
            }

            $decoded = json_decode($payload, true);
        } elseif (is_object($payload)) {
            $decoded = (array) $payload;
        } elseif (is_array($payload)) {
            $decoded = $payload;
        } else {
            return $empty;
        }

        if (! is_array($decoded)) {
            return $empty;
        }

        return [
            'event' => self::tokenOrNull($decoded['event'] ?? null),
            'provider' => self::tokenOrNull($decoded['provider'] ?? null),
            'provider_status' => self::tokenOrNull($decoded['provider_status'] ?? null),
            // Timestamps keep their original casing: an ISO-8601 "T" must
            // survive so the value still parses as a timestamp.
            'recorded_at' => self::textOrNull($decoded['recorded_at'] ?? null),
        ];
    }

    private static function tokenOrNull(mixed $value): ?string
    {
        $text = self::textOrNull($value);

        return $text === null ? null : strtolower($text);
    }

    private static function textOrNull(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    /**
     * Keep only the ledger columns that exist in the current schema.
     *
     * @param  array<string, mixed>  $columns
     * @return array<string, mixed>
     */
    public static function ledgerColumns(array $columns): array
    {
        return self::schemaReady('payments_ledger') ? $columns : [];
    }

    public static function paymentsLedgerReady(): bool
    {
        return self::schemaReady('payments_ledger');
    }

    public static function refundLedgerReady(): bool
    {
        return self::schemaReady('payment_refunds');
    }

    /** Test seam: forget the cached schema probe. */
    public static function resetSchemaCache(): void
    {
        self::$schemaReady = null;
    }

    private static function schemaReady(string $key): bool
    {
        if (self::$schemaReady === null) {
            self::$schemaReady = [];
        }

        if (! array_key_exists($key, self::$schemaReady)) {
            try {
                self::$schemaReady[$key] = $key === 'payment_refunds'
                    ? Schema::hasTable('payment_refunds')
                    : (Schema::hasTable('payments') && Schema::hasColumn('payments', 'funding_source'));
            } catch (\Throwable) {
                // An unreadable schema must never break a payment write.
                self::$schemaReady[$key] = false;
            }
        }

        return self::$schemaReady[$key];
    }
}
