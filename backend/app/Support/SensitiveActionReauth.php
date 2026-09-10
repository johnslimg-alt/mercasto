<?php

namespace App\Support;

use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

final class SensitiveActionReauth
{
    public const RECENT_TOKEN_MINUTES = 5;

    public static function passes(Request $request, User $user, ?string $password = null): bool
    {
        if (self::hasPassword($user)) {
            return self::passwordMatches($user, $password);
        }

        return self::hasRecentAccessToken($request);
    }

    public static function hasPassword(User $user): bool
    {
        return is_string($user->password) && $user->password !== '';
    }

    public static function passwordMatches(User $user, ?string $password): bool
    {
        return is_string($password)
            && $password !== ''
            && is_string($user->password)
            && $user->password !== ''
            && Hash::check($password, $user->password);
    }

    public static function hasRecentAccessToken(Request $request): bool
    {
        $token = $request->user()?->currentAccessToken();
        if (! is_object($token) || ! isset($token->created_at) || ! $token->created_at) {
            return false;
        }

        $createdAt = $token->created_at instanceof CarbonInterface
            ? $token->created_at
            : Carbon::parse((string) $token->created_at);

        $now = now();
        $createdAtSecond = $createdAt->timestamp;

        return $createdAtSecond >= $now->copy()->subMinutes(self::RECENT_TOKEN_MINUTES)->timestamp
            && $createdAtSecond <= $now->copy()->addMinute()->timestamp;
    }
}
