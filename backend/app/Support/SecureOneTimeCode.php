<?php

namespace App\Support;

use RuntimeException;

final class SecureOneTimeCode
{
    private const VERSION = 'otp-v1';

    public static function hash(string $code, string $purpose): string
    {
        return hash_hmac('sha256', trim($code), self::key($purpose));
    }

    public static function verify(string $code, mixed $storedHash, string $purpose): bool
    {
        if (! is_string($storedHash) || ! preg_match('/^[a-f0-9]{64}$/', $storedHash)) {
            return false;
        }

        return hash_equals($storedHash, self::hash($code, $purpose));
    }

    public static function cacheKey(string $purpose, string $subject): string
    {
        return self::VERSION.':'.$purpose.':'.hash_hmac('sha256', $subject, self::key($purpose.'-subject'));
    }

    private static function key(string $purpose): string
    {
        $appKey = trim((string) config('app.key', ''));
        if ($appKey === '') {
            throw new RuntimeException('Application key is required for one-time code hashing.');
        }

        return hash_hmac('sha256', self::VERSION.':'.$purpose, $appKey, true);
    }
}
