<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

final class EmailIdentity
{
    public static function normalize(string $email): string
    {
        return mb_strtolower(trim($email), 'UTF-8');
    }

    /** @return Collection<int, User> */
    public static function matches(string $email, ?int $exceptUserId = null, int $limit = 2): Collection
    {
        $query = User::query()
            ->whereRaw('LOWER(TRIM(email)) = ?', [self::normalize($email)]);

        if ($exceptUserId !== null) {
            $query->where('id', '!=', $exceptUserId);
        }

        return $query->orderBy('id')->limit($limit)->get();
    }

    public static function exists(string $email, ?int $exceptUserId = null): bool
    {
        return self::matches($email, $exceptUserId, 1)->isNotEmpty();
    }

    public static function resolveLogin(string $email): ?User
    {
        $trimmed = trim($email);
        $exact = User::query()->where('email', $trimmed)->first();
        $matches = self::matches($trimmed, null, 2);

        if ($matches->count() === 1) {
            return $matches->first();
        }

        return $matches->count() > 1 ? $exact : null;
    }
}
