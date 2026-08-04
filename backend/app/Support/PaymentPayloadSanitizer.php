<?php

namespace App\Support;

use Carbon\CarbonInterface;

final class PaymentPayloadSanitizer
{
    private const SCHEMA_VERSION = 1;

    public static function checkout(
        array $payload,
        ?int $httpStatus = null,
        string $event = 'checkout_response',
        CarbonInterface|string|null $recordedAt = null,
    ): array {
        return self::compact([
            'schema_version' => self::SCHEMA_VERSION,
            'provider' => 'clip',
            'event' => self::safeToken($event),
            'http_status' => $httpStatus,
            'provider_status' => self::safeToken(self::firstString(
                $payload['status'] ?? null,
                data_get($payload, 'payment_request.status'),
                $payload['resource_status'] ?? null,
            )),
            'object_type' => self::safeToken(self::firstString(
                $payload['object_type'] ?? null,
                data_get($payload, 'payment_request.object_type'),
            )),
            'recorded_at' => self::timestamp($recordedAt),
        ]);
    }

    public static function webhook(
        array $payload,
        string $event = 'verified_checkout',
        CarbonInterface|string|null $recordedAt = null,
    ): array {
        return self::compact([
            'schema_version' => self::SCHEMA_VERSION,
            'provider' => 'clip',
            'event' => self::safeToken($event),
            'resource' => self::safeToken(self::firstString(
                $payload['resource'] ?? null,
                data_get($payload, 'payment_request.resource'),
            )),
            'provider_status' => self::safeToken(self::firstString(
                $payload['resource_status'] ?? null,
                $payload['status'] ?? null,
                data_get($payload, 'payment_request.resource_status'),
                data_get($payload, 'payment_request.status'),
            )),
            'recorded_at' => self::timestamp($recordedAt),
        ]);
    }

    public static function internal(
        string $event,
        CarbonInterface|string|null $recordedAt = null,
    ): array {
        return [
            'schema_version' => self::SCHEMA_VERSION,
            'provider' => 'internal',
            'event' => self::safeToken($event) ?? 'internal_payment',
            'recorded_at' => self::timestamp($recordedAt),
        ];
    }

    public static function legacyWebhook(
        mixed $value,
        CarbonInterface|string|null $recordedAt = null,
    ): ?array {
        $payload = self::decode($value);
        if ($payload === null) {
            return null;
        }

        if (($payload['provider'] ?? null) === 'internal') {
            return self::internal((string) ($payload['event'] ?? 'internal_payment'), $recordedAt);
        }

        if (($payload['method'] ?? null) === 'account_balance') {
            return self::internal('account_balance', $payload['paid_at'] ?? $recordedAt);
        }

        if (self::hasAnyKey($payload, [
            'manual_activation',
            'manual_reconciliation',
            'reconciled_manually',
            'reconciled_via',
        ])) {
            return self::internal('manual_reconciliation', $payload['reconciled_at'] ?? $recordedAt);
        }

        return self::webhook($payload, 'provider_webhook', $recordedAt);
    }

    public static function legacyCheckout(
        mixed $value,
        CarbonInterface|string|null $recordedAt = null,
    ): ?array {
        $payload = self::decode($value);
        return $payload === null ? null : self::checkout($payload, null, 'checkout_response', $recordedAt);
    }

    private static function decode(mixed $value): ?array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_object($value)) {
            return (array) $value;
        }

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : null;
    }

    private static function firstString(mixed ...$values): ?string
    {
        foreach ($values as $value) {
            if (is_string($value) || is_numeric($value)) {
                $text = trim((string) $value);
                if ($text !== '') {
                    return $text;
                }
            }
        }

        return null;
    }

    private static function safeToken(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = strtolower(trim($value));
        $value = preg_replace('/[^a-z0-9_.:-]+/', '_', $value) ?? '';
        $value = trim($value, '_');

        return $value === '' ? null : substr($value, 0, 64);
    }

    private static function timestamp(CarbonInterface|string|null $value): string
    {
        if ($value instanceof CarbonInterface) {
            return $value->toIso8601String();
        }

        if (is_string($value) && trim($value) !== '') {
            try {
                return \Carbon\Carbon::parse($value)->toIso8601String();
            } catch (\Throwable) {
                // Fall through to the current application clock.
            }
        }

        return now()->toIso8601String();
    }

    private static function compact(array $payload): array
    {
        return array_filter(
            $payload,
            static fn (mixed $value): bool => $value !== null && $value !== '',
        );
    }

    private static function hasAnyKey(array $payload, array $keys): bool
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $payload)) {
                return true;
            }
        }

        return false;
    }
}
