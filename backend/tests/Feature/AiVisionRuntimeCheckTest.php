<?php

namespace Tests\Feature;

use App\Services\LocalAiClient;
use Mockery;
use RuntimeException;
use Tests\TestCase;

class AiVisionRuntimeCheckTest extends TestCase
{
    public function test_vision_check_uses_synthetic_768_image_and_public_moderation_sized_options(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatPro')
            ->once()
            ->withArgs(function (array $messages, array $options): bool {
                $payload = $messages[1]['images'][0] ?? '';
                $binary = base64_decode((string) $payload, true);
                $size = is_string($binary) ? getimagesizefromstring($binary) : false;

                return ($messages[1]['role'] ?? null) === 'user'
                    && is_array($size)
                    && ($size[0] ?? null) === 768
                    && ($size[1] ?? null) === 768
                    && ($options['max_tokens'] ?? null) === 220
                    && ($options['num_ctx'] ?? null) === 3072
                    && ($options['temperature'] ?? null) === 0.0;
            })
            ->andReturn([
                'choices' => [['message' => ['content' => '{"ok":true}']]],
                'provider' => 'ollama',
                'model' => 'qwen3-vl:4b-instruct',
            ]);
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:vision-runtime-check --timeout=60')
            ->expectsOutputToContain('local AI vision runtime OK')
            ->expectsOutputToContain('elapsed_ms=')
            ->assertExitCode(0);
    }

    public function test_vision_check_fails_closed_when_local_ai_is_unavailable(): void
    {
        $client = Mockery::mock(LocalAiClient::class);
        $client->shouldReceive('chatPro')
            ->once()
            ->andThrow(new RuntimeException('unavailable'));
        $this->app->instance(LocalAiClient::class, $client);

        $this->artisan('ai:vision-runtime-check')
            ->expectsOutputToContain('local AI vision runtime check FAILED')
            ->expectsOutputToContain('elapsed_ms=')
            ->assertExitCode(1);
    }
}
