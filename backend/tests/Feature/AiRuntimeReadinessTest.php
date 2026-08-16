<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiRuntimeReadinessTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.ollama.base_url' => 'http://ollama.test:11434',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
        ]);
    }

    public function test_readiness_proves_transport_installed_model_and_loaded_state(): void
    {
        Http::fake([
            'http://ollama.test:11434/api/tags' => Http::response([
                'models' => [['name' => 'qwen3-vl:4b-instruct']],
            ]),
            'http://ollama.test:11434/api/ps' => Http::response([
                'models' => [['name' => 'qwen3-vl:4b-instruct']],
            ]),
        ]);

        $this->artisan('ai:runtime-readiness')
            ->expectsOutputToContain('local AI readiness OK')
            ->expectsOutputToContain('installed=yes')
            ->expectsOutputToContain('loaded=yes')
            ->assertExitCode(0);
    }

    public function test_readiness_fails_before_inference_when_configured_model_is_missing(): void
    {
        Http::fake([
            'http://ollama.test:11434/api/tags' => Http::response([
                'models' => [['name' => 'another-model:latest']],
            ]),
        ]);

        $this->artisan('ai:runtime-readiness')
            ->expectsOutputToContain('stage=model_missing')
            ->expectsOutputToContain('configured=qwen3-vl:4b-instruct')
            ->assertExitCode(1);

        Http::assertSentCount(1);
    }

    public function test_readiness_reports_transport_failure_without_secrets(): void
    {
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('offline'));

        $this->artisan('ai:runtime-readiness')
            ->expectsOutputToContain('stage=transport')
            ->expectsOutputToContain('host=ollama.test')
            ->assertExitCode(1);
    }
}
