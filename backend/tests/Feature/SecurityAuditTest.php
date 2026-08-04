<?php

namespace Tests\Feature;

use App\Http\Middleware\SecurityAuditMiddleware;
use App\Support\SecurityAudit;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Mockery;
use Psr\Log\LoggerInterface;
use Tests\TestCase;

class SecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_security_failures_are_classified_without_request_bodies(): void
    {
        $this->assertSame('auth_rejected', SecurityAudit::classify(
            Request::create('/api/login', 'POST'),
            422,
        ));
        $this->assertSame('auth_rejected', SecurityAudit::classify(
            Request::create('/api/login/two-factor', 'POST'),
            422,
        ));
        $this->assertSame('auth_rejected', SecurityAudit::classify(
            Request::create('/api/forgot-password', 'POST'),
            422,
        ));
        $this->assertSame('authorization_denied', SecurityAudit::classify(
            Request::create('/api/ads/15', 'DELETE'),
            403,
        ));
        $this->assertSame('upload_rejected', SecurityAudit::classify(
            Request::create('/api/user/avatar', 'POST'),
            422,
        ));
        $this->assertSame('webhook_rejected', SecurityAudit::classify(
            Request::create('/api/webhooks/clip', 'POST'),
            401,
        ));
        $this->assertSame('rate_limited', SecurityAudit::classify(
            Request::create('/api/search', 'GET'),
            429,
        ));
        $this->assertSame('authentication_required', SecurityAudit::classify(
            Request::create('/api/user', 'GET'),
            401,
        ));
        $this->assertNull(SecurityAudit::classify(
            Request::create('/api/ads', 'GET'),
            200,
        ));
    }

    public function test_context_hashes_email_and_ip_and_omits_credentials(): void
    {
        $request = Request::create('/api/login', 'POST', [
            'email' => 'Private.User@Example.test',
            'password' => 'never-log-this-password',
            'token' => 'never-log-this-token',
        ], [], [], [
            'REMOTE_ADDR' => '203.0.113.25',
        ]);

        $context = SecurityAudit::context('auth_rejected', $request, 422);
        $encoded = json_encode($context);

        $this->assertSame('auth_rejected', $context['event']);
        $this->assertSame(422, $context['status']);
        $this->assertSame(64, strlen($context['email_hash']));
        $this->assertSame(64, strlen($context['ip_hash']));
        $this->assertStringNotContainsString('Private.User', $encoded);
        $this->assertStringNotContainsString('never-log-this-password', $encoded);
        $this->assertStringNotContainsString('never-log-this-token', $encoded);
        $this->assertArrayNotHasKey('password', $context);
        $this->assertArrayNotHasKey('token', $context);
    }

    public function test_unapproved_route_values_are_omitted_while_safe_resource_ids_are_retained(): void
    {
        $request = Request::create('/api/auth/challenge/opaque-value/42', 'POST', [
            'email' => 'audit-user@example.test',
        ], [], [], [
            'REMOTE_ADDR' => '203.0.113.60',
        ]);
        $route = new class {
            public function uri(): string
            {
                return 'api/auth/challenge/{code}/{id}';
            }

            public function parameters(): array
            {
                return [
                    'code' => 'opaque-route-value',
                    'id' => '42',
                ];
            }
        };
        $request->setRouteResolver(fn () => $route);

        $context = SecurityAudit::context('auth_rejected', $request, 422);
        $encoded = json_encode($context);

        $this->assertSame('api/auth/challenge/{code}/{id}', $context['route']);
        $this->assertSame('id', $context['resource_parameter']);
        $this->assertSame('42', $context['resource_id']);
        $this->assertStringNotContainsString('opaque-route-value', $encoded);
        $this->assertStringNotContainsString('audit-user@example.test', $encoded);
    }

    public function test_registered_middleware_records_failed_login_without_credentials(): void
    {
        $logger = Mockery::mock(LoggerInterface::class);
        Log::shouldReceive('channel')
            ->once()
            ->with('security')
            ->andReturn($logger);
        $logger->shouldReceive('warning')
            ->once()
            ->with('security_event', Mockery::on(function (array $context): bool {
                $encoded = json_encode($context);

                return ($context['event'] ?? null) === 'auth_rejected'
                    && ($context['status'] ?? null) === 422
                    && ($context['route'] ?? null) === 'api/login'
                    && isset($context['email_hash'])
                    && ! str_contains($encoded, 'missing-user@example.test')
                    && ! str_contains($encoded, 'irrelevant-password');
            }));

        $request = Request::create('/api/login', 'POST', [
            'email' => 'missing-user@example.test',
            'password' => 'irrelevant-password',
        ], [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'REMOTE_ADDR' => '192.0.2.45',
        ]);
        $kernel = $this->app->make(Kernel::class);
        $response = $kernel->handle($request);

        $this->assertSame(422, $response->getStatusCode());
        $kernel->terminate($request, $response);
    }

    public function test_registered_middleware_records_actual_unauthenticated_api_request(): void
    {
        $logger = Mockery::mock(LoggerInterface::class);
        Log::shouldReceive('channel')
            ->once()
            ->with('security')
            ->andReturn($logger);
        $logger->shouldReceive('warning')
            ->once()
            ->with('security_event', Mockery::on(fn (array $context): bool =>
                ($context['event'] ?? null) === 'authentication_required'
                && ($context['status'] ?? null) === 401
                && ($context['route'] ?? null) === 'api/user'
            ));

        $request = Request::create('/api/user', 'GET', [], [], [], [
            'HTTP_ACCEPT' => 'application/json',
            'REMOTE_ADDR' => '192.0.2.44',
        ]);
        $kernel = $this->app->make(Kernel::class);
        $response = $kernel->handle($request);

        $this->assertSame(401, $response->getStatusCode());
        $kernel->terminate($request, $response);
    }

    public function test_terminable_middleware_writes_only_to_security_channel(): void
    {
        $request = Request::create('/api/webhooks/clip', 'POST', [
            'secret' => 'provider-secret',
        ], [], [], [
            'REMOTE_ADDR' => '198.51.100.40',
        ]);
        $response = new JsonResponse(['status' => 'invalid_signature'], 401);

        $logger = Mockery::mock(LoggerInterface::class);
        Log::shouldReceive('channel')
            ->once()
            ->with('security')
            ->andReturn($logger);
        $logger->shouldReceive('warning')
            ->once()
            ->with('security_event', Mockery::on(function (array $context): bool {
                $encoded = json_encode($context);

                return ($context['event'] ?? null) === 'webhook_rejected'
                    && ($context['status'] ?? null) === 401
                    && ! str_contains($encoded, 'provider-secret')
                    && ! array_key_exists('secret', $context);
            }));

        (new SecurityAuditMiddleware())->terminate($request, $response);
    }
}
