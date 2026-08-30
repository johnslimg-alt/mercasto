<?php

namespace Tests\Feature;

use App\Services\LocalAiClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LocalAiClientRoutingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.ollama.base_url' => 'http://ollama.test',
            'services.ollama.chat_model' => 'qwen3.8:9b-local',
            'services.ollama.vision_model' => 'qwen3-vl:4b-instruct',
            'services.ollama.keep_alive' => '24h',
        ]);
    }

    public function test_text_requests_use_the_fast_text_model(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3.8:9b-local',
                'message' => ['content' => 'OK'],
            ]),
        ]);

        app(LocalAiClient::class)->chatFlash([
            ['role' => 'user', 'content' => 'Health check'],
        ], ['max_tokens' => 8, 'num_ctx' => 512]);

        Http::assertSent(fn ($request): bool => $request['model'] === 'qwen3.8:9b-local'
            && data_get($request->data(), 'messages.0.images') === null
            && $request['think'] === false);
    }

    public function test_image_requests_use_the_dedicated_vision_model(): void
    {
        Http::fake([
            'http://ollama.test/api/chat' => Http::response([
                'model' => 'qwen3-vl:4b-instruct',
                'message' => ['content' => '{"ok":true}'],
            ]),
        ]);

        app(LocalAiClient::class)->chatPro([
            ['role' => 'user', 'content' => 'Inspect image', 'images' => ['ZmFrZQ==']],
        ], ['max_tokens' => 16]);

        Http::assertSent(fn ($request): bool => $request['model'] === 'qwen3-vl:4b-instruct'
            && data_get($request->data(), 'messages.0.images.0') === 'ZmFrZQ==');
    }
}
