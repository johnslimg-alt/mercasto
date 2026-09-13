<?php

namespace Tests\Unit;

use App\Models\User;
use App\Support\SensitiveActionReauth;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SensitiveActionReauthTest extends TestCase
{
    #[DataProvider('tokenAges')]
    public function test_passwordless_recent_token_window(int $minutesOld, bool $expected): void
    {
        // Pin the clock to the start of the current second. PersonalAccessToken stores created_at
        // through Eloquent's date cast at whole-second precision, while the window bound in
        // SensitiveActionReauth::hasRecentAccessToken() is derived from a second, later now() call.
        // Leaving the clock live lets a second boundary fall between the two reads, which drops the
        // token just outside the inclusive boundary and fails the "exactly RECENT_TOKEN_MINUTES old"
        // case (5, true) at random. Freezing puts the fixture and the comparison on the same instant
        // and the same resolution, without relaxing the assertion.
        $this->freezeSecond();

        $token = new PersonalAccessToken();
        $token->created_at = now()->subMinutes($minutesOld);
        $user = (new User())->forceFill(['password' => null])->withAccessToken($token);
        $request = Request::create('/api/user/password', 'PUT');
        $request->setUserResolver(fn () => $user);

        $this->assertSame($expected, SensitiveActionReauth::passes($request, $user));
    }

    public static function tokenAges(): array
    {
        return [[0, true], [5, true], [6, false]];
    }

    public function test_recent_token_does_not_bypass_existing_password(): void
    {
        $token = new PersonalAccessToken();
        $token->created_at = now();
        $user = (new User())->forceFill(['password' => 'stored-hash'])->withAccessToken($token);
        $request = Request::create('/api/user/password', 'PUT');
        $request->setUserResolver(fn () => $user);

        $this->assertFalse(SensitiveActionReauth::passes($request, $user));
        $this->assertTrue(SensitiveActionReauth::hasPassword($user));
    }
}
