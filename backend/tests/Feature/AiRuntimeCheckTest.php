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

    public function test_runtime_check_fails_closed_when_local_ai_is_unavailable(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatFlash')
            ->once()
            ->andThrow(new RuntimeException('unavailable'));
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:runtime-check')
            ->expectsOutputToContain('local AI runtime check FAILED')
            ->assertExitCode(1);
    }
}
