<?php

namespace Tests\Feature;

use App\Services\LocalAiClient;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class AiRuntimeCheckTest extends TestCase
{
    public function test_runtime_check_passes_only_for_the_local_ollama_provider(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatFlash')
            ->once()
            ->withArgs(function (array $messages, array $options): bool {
                $serialized = json_encode($messages);

                return str_contains((string) $serialized, 'runtime health check')
                    && ! str_contains((string) $serialized, 'image')
                    && ($options['max_tokens'] ?? null) === 8
                    && ($options['num_ctx'] ?? null) === 512;
            })
            ->andReturn([
                'choices' => [['message' => ['content' => 'OK']]],
                'provider' => 'ollama',
                'model' => 'qwen3-vl:4b-instruct',
            ]);
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:runtime-check')
            ->expectsOutputToContain('local AI runtime OK provider=ollama')
            ->assertExitCode(0);
    }

    public function test_runtime_check_recovers_from_one_transport_failure(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatFlash')
            ->twice()
            ->andReturnUsing(function () {
                static $attempt = 0;
                $attempt++;

                if ($attempt === 1) {
                    throw new RuntimeException('transient');
                }

                return [
                    'choices' => [['message' => ['content' => 'OK']]],
                    'provider' => 'ollama',
                    'model' => 'qwen3-vl:4b-instruct',
                ];
            });
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:runtime-check', ['--attempts' => 2])
            ->expectsOutputToContain('local AI runtime transport failure attempt=1/2 exception=RuntimeException')
            ->expectsOutputToContain('local AI runtime OK provider=ollama')
            ->assertExitCode(0);
    }

    public function test_runtime_check_fails_closed_after_all_transport_attempts(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatFlash')
            ->twice()
            ->andThrow(new RuntimeException('unavailable'));
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:runtime-check', ['--attempts' => 2])
            ->expectsOutputToContain('local AI runtime transport failure attempt=1/2 exception=RuntimeException')
            ->expectsOutputToContain('local AI runtime transport failure attempt=2/2 exception=RuntimeException')
            ->expectsOutputToContain('local AI runtime check FAILED after 2 transport attempt(s)')
            ->assertExitCode(1);
    }

    public function test_runtime_check_does_not_retry_unexpected_provider(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatFlash')
            ->once()
            ->andReturn([
                'provider' => 'external',
                'model' => 'unexpected-model',
            ]);
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:runtime-check', ['--attempts' => 2])
            ->expectsOutputToContain('local AI runtime check FAILED: unexpected provider')
            ->assertExitCode(1);
    }

    public function test_runtime_check_does_not_retry_missing_model(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatFlash')
            ->once()
            ->andReturn([
                'provider' => 'ollama',
                'model' => '',
            ]);
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:runtime-check', ['--attempts' => 2])
            ->expectsOutputToContain('local AI runtime check FAILED: model was not reported')
            ->assertExitCode(1);
    }

    public function test_runtime_check_caps_attempts_at_three(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatFlash')
            ->times(3)
            ->andThrow(new RuntimeException('unavailable'));
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:runtime-check', ['--attempts' => 99])
            ->expectsOutputToContain('local AI runtime transport failure attempt=3/3 exception=RuntimeException')
            ->expectsOutputToContain('local AI runtime check FAILED after 3 transport attempt(s)')
            ->assertExitCode(1);
    }

    public function test_post_merge_workflow_uses_two_runtime_check_attempts(): void
    {
        $workflow = file_get_contents(base_path('../.github/workflows/post-merge-production-verify.yml'));

        $this->assertIsString($workflow);
        $this->assertStringContainsString(
            'php artisan ai:runtime-check --timeout=45 --attempts=2',
            $workflow,
        );
    }
}
