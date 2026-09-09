<?php

namespace App\Support;

use App\Models\User;
final class TrustedE2eAccount
{
    public static function matches(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $email = trim((string) $user->email);
        $role = trim((string) $user->role);

        if ($email === '' || $role === '') {
            return false;
        }

        foreach ((array) config('services.trusted_e2e_accounts', []) as $account) {
            $trustedEmail = trim((string) ($account['email'] ?? ''));
            $trustedRole = trim((string) ($account['role'] ?? ''));

            if ($trustedEmail !== '' && $trustedRole !== '' && $email === $trustedEmail && $role === $trustedRole) {
                return true;
            }
        }

        return false;
    }
}
