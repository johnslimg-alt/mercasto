<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiRuntimePreloadTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.ollama.base_url' => 'http://ollama.test:11434',
            'services.ollama.chat_model' => 'qwen3-vl:4b-instruct',
            'services.ollama.keep_alive' => '24h',
        ]);
    }

    public function test_preload_uses_empty_generate_request_and_proves_model_is_loaded(): void
    {
        Http::fake([
            'http://ollama.test:11434/api/generate' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'done' => true,
            ]),
            'http://ollama.test:11434/api/ps' => Http::response([
                'models' => [['name' => 'qwen3-vl:4b-instruct']],
            ]),
        ]);

        $this->artisan('ai:runtime-preload --timeout=90')
            ->expectsOutputToContain('local AI preload OK')
            ->expectsOutputToContain('loaded=yes')
            ->assertExitCode(0);

        Http::assertSent(function ($request): bool {
            if ($request->url() !== 'http://ollama.test:11434/api/generate') {
                return false;
            }

            $payload = $request->data();
            return ($payload['model'] ?? null) === 'qwen3-vl:4b-instruct'
                && ($payload['stream'] ?? null) === false
                && ($payload['keep_alive'] ?? null) === '24h'
                && ! array_key_exists('prompt', $payload)
                && ! array_key_exists('images', $payload);
        });
    }

    public function test_preload_fails_closed_when_model_is_not_resident_after_request(): void
    {
        Http::fake([
            'http://ollama.test:11434/api/generate' => Http::response(['done' => true]),
            'http://ollama.test:11434/api/ps' => Http::response(['models' => []]),
        ]);

        $this->artisan('ai:runtime-preload')
            ->expectsOutputToContain('stage=verify loaded=no')
            ->assertExitCode(1);
    }

    public function test_preload_fails_closed_when_ollama_is_unavailable(): void
    {
        Http::fake(fn () => throw new \Illuminate\Http\Client\ConnectionException('offline'));

        $this->artisan('ai:runtime-preload')
            ->expectsOutputToContain('stage=request')
            ->assertExitCode(1);
    }
}
