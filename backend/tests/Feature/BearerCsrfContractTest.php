<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BearerCsrfContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_cookie_and_xsrf_values_do_not_authenticate_protected_api_routes(): void
    {
        $this->withCookie('laravel_session', 'forged-session')
            ->withCookie('XSRF-TOKEN', 'forged-xsrf')
            ->withHeader('X-XSRF-TOKEN', 'forged-xsrf')
            ->putJson('/api/user/profile', ['name' => 'Cross-site attacker'])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_personal_access_bearer_token_authenticates_the_api(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('csrf-contract-test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertJsonPath('email', $user->email);
    }

    public function test_untrusted_origin_is_not_echoed_by_cors(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://evil.example',
            'Access-Control-Request-Method' => 'PUT',
            'Access-Control-Request-Headers' => 'authorization,content-type',
        ])->call('OPTIONS', '/api/user/profile');

        $this->assertContains($response->getStatusCode(), [200, 204]);
        $this->assertNull($response->headers->get('Access-Control-Allow-Origin'));
        $this->assertNotSame('true', strtolower((string) $response->headers->get('Access-Control-Allow-Credentials')));
    }

    public function test_trusted_origin_is_explicit_and_credentials_are_disabled(): void
    {
        config([
            'cors.allowed_origins' => ['https://mercasto.com'],
            'cors.allowed_origins_patterns' => [],
            'cors.supports_credentials' => false,
        ]);

        $response = $this->withHeaders([
            'Origin' => 'https://mercasto.com',
            'Access-Control-Request-Method' => 'PUT',
            'Access-Control-Request-Headers' => 'authorization,content-type',
        ])->call('OPTIONS', '/api/user/profile');

        $this->assertContains($response->getStatusCode(), [200, 204]);
        $response->assertHeader('Access-Control-Allow-Origin', 'https://mercasto.com');
        $this->assertNotSame('true', strtolower((string) $response->headers->get('Access-Control-Allow-Credentials')));
    }
}
