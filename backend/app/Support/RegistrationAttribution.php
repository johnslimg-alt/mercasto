<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Normalises the registration attribution slice that the frontend captures from
 * `mercasto.attribution.first.v1` / `.last.v1` and sends with the registration
 * request.
 *
 * Only whitelisted, length-capped, non-PII fields are accepted: this is campaign
 * data, never a user identifier. Records are written by
 * {@see \App\Observers\UserRegistrationAttributionObserver}.
 */
class RegistrationAttribution
{
    /** Longest accepted value for campaign identifiers. */
    public const MAX_FIELD_LENGTH = 180;

    /** Longest accepted value for landing paths. */
    public const MAX_PATH_LENGTH = 300;

    public const STRING_FIELDS = [
        'attribution_source' => self::MAX_FIELD_LENGTH,
        'attribution_medium' => self::MAX_FIELD_LENGTH,
        'attribution_campaign' => self::MAX_FIELD_LENGTH,
        'attribution_content' => self::MAX_FIELD_LENGTH,
        'attribution_term' => self::MAX_FIELD_LENGTH,
        'attribution_click_platform' => self::MAX_FIELD_LENGTH,
        'attribution_channel' => self::MAX_FIELD_LENGTH,
        'attribution_referrer_host' => self::MAX_FIELD_LENGTH,
        'attribution_landing_path' => self::MAX_PATH_LENGTH,
        'first_touch_source' => self::MAX_FIELD_LENGTH,
        'first_touch_medium' => self::MAX_FIELD_LENGTH,
        'first_touch_campaign' => self::MAX_FIELD_LENGTH,
        'first_touch_content' => self::MAX_FIELD_LENGTH,
        'first_touch_term' => self::MAX_FIELD_LENGTH,
        'first_touch_landing_path' => self::MAX_PATH_LENGTH,
    ];

    public const BOOLEAN_FIELDS = [
        'attribution_paid',
        'attribution_ai_referral',
        'first_touch_paid',
    ];

    /** Registration request paths that may record attribution. */
    public const REGISTRATION_PATHS = [
        'api/register',
        'api/auth/phone/verify',
        'api/auth/telegram/callback',
        'api/auth/*/callback',
    ];

    /** Attribution is only trusted for a bounded window after capture. */
    public const MAX_CAPTURED_AT_AGE_DAYS = 31;

    public const MAX_CAPTURED_AT_FUTURE_MINUTES = 10;

    /**
     * Builds the validated attribution record for a registration request.
     *
     * @return array<string, mixed>
     */
    public static function fromRequest(Request $request): array
    {
        return self::fromArray($request->all());
    }

    /**
     * Whitelists and normalises raw input. Unknown keys are dropped.
     *
     * @param  array<string, mixed>  $source
     * @return array<string, mixed>
     */
    public static function fromArray(array $source): array
    {
        $record = [];

        foreach (self::STRING_FIELDS as $field => $maxLength) {
            $value = self::clean($source[$field] ?? null, $maxLength);
            if ($value !== null) {
                $record[$field] = $value;
            }
        }

        foreach (self::BOOLEAN_FIELDS as $field) {
            if (! array_key_exists($field, $source)) {
                continue;
            }

            $raw = $source[$field];
            if (is_bool($raw)) {
                $record[$field] = $raw;
                continue;
            }

            if ($raw === 0 || $raw === 1 || $raw === '0' || $raw === '1') {
                $record[$field] = (bool) $raw;
            }
        }

        $capturedAt = self::capturedAt($source['attribution_captured_at'] ?? null);
        if ($capturedAt !== null) {
            $record['attribution_captured_at'] = $capturedAt;
        }

        return $record;
    }

    /**
     * Extracts only attribution keys from a mixed payload (for example the cached
     * OAuth registration consent array).
     *
     * @param  array<string, mixed>  $source
     * @return array<string, mixed>
     */
    public static function only(array $source): array
    {
        return self::fromArray($source);
    }

    /**
     * True when the request targets one of the registration endpoints.
     */
    public static function isRegistrationRequest(Request $request): bool
    {
        foreach (self::REGISTRATION_PATHS as $path) {
            if ($request->is($path)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Canonical registration method for the current request path.
     *
     * Derived server-side so a client cannot mislabel the channel, and so the
     * email/password path (which sends no method in the body) is still labelled.
     */
    public static function methodFor(Request $request): ?string
    {
        if ($request->is('api/register')) {
            return 'email';
        }

        if ($request->is('api/auth/phone/verify')) {
            return 'phone';
        }

        if ($request->is('api/auth/telegram/callback')) {
            return 'telegram';
        }

        $provider = self::providerFromCallbackPath($request->path());
        if ($provider !== null) {
            return $provider;
        }

        return null;
    }

    private static function providerFromCallbackPath(string $path): ?string
    {
        if (! preg_match('#^api/auth/([a-z0-9_-]+)/callback$#', $path, $matches)) {
            return null;
        }

        return $matches[1] === 'telegram' ? 'telegram' : $matches[1];
    }

    private static function clean(mixed $value, int $maxLength): ?string
    {
        if (! is_string($value) && ! is_numeric($value)) {
            return null;
        }

        $clean = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $value) ?? '';
        $clean = trim(preg_replace('/\s+/u', ' ', $clean) ?? '');

        if ($clean === '') {
            return null;
        }

        return mb_substr($clean, 0, $maxLength);
    }

    private static function capturedAt(mixed $value): ?Carbon
    {
        if ($value === null || $value === '' || ! is_string($value)) {
            return null;
        }

        try {
            $instant = Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }

        $now = now();
        if ($instant->greaterThan($now->copy()->addMinutes(self::MAX_CAPTURED_AT_FUTURE_MINUTES))) {
            return null;
        }

        if ($instant->lessThan($now->copy()->subDays(self::MAX_CAPTURED_AT_AGE_DAYS))) {
            return null;
        }

        return $instant;
    }
}
