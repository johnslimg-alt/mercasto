<?php

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;

final class PrivacyFingerprint
{
    public static function ip(?string $ip, string $scope, int $length = 64): ?string
    {
        $normalized = trim((string) $ip);
        if ($normalized === '') {
            return null;
        }

        $scope = trim($scope);
        if ($scope === '') {
            throw new InvalidArgumentException('Privacy fingerprint scope is required.');
        }
        if ($length < 32 || $length > 64) {
            throw new InvalidArgumentException('Privacy fingerprint length must be between 32 and 64.');
        }

        $key = (string) config('app.key');
        if ($key === '') {
            throw new RuntimeException('APP_KEY is required for privacy fingerprints.');
        }

        $digest = hash_hmac('sha256', "mercasto-ip:{$scope}\0{$normalized}", $key);

        return substr($digest, 0, $length);
    }

    /**
     * Read-only compatibility for rows written before scoped HMAC fingerprints.
     * Never persist this value for new telemetry.
     */
    public static function legacySha256(?string $ip): ?string
    {
        $normalized = trim((string) $ip);

        return $normalized === '' ? null : hash('sha256', $normalized);
    }
}
