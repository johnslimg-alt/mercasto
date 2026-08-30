<?php

namespace App\Services;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Backwards-compatible local AI adapter.
 *
 * The class name is retained to avoid a risky broad refactor, but it never
 * contacts an external AI provider. All content stays on
 * the Mercasto VPS and is processed by the local Ollama service.
 */
class LocalAiClient
{
    public function chatFlash(array $messages, array $options = []): array
    {
        return $this->chatLocal($messages, $options, (int) Arr::get($options, 'timeout', 60));
    }

    public function chatPro(array $messages, array $options = []): array
    {
        return $this->chatLocal($messages, $options, (int) Arr::get($options, 'timeout', 90));
    }

    private function chatLocal(array $messages, array $options, int $timeout): array
    {
        if ($messages === []) {
            throw new RuntimeException('AI messages cannot be empty.');
        }

        $baseUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');
        $hasImages = collect($messages)->contains(static function ($message): bool {
            return is_array($message)
                && isset($message['images'])
                && is_array($message['images'])
                && $message['images'] !== [];
        });
        $defaultModel = $hasImages
            ? (string) config('services.ollama.vision_model', 'qwen3-vl:4b-instruct')
            : (string) config('services.ollama.chat_model', 'qwen3.8:9b-local');
        $model = (string) Arr::get($options, 'model', $defaultModel);
        if ($baseUrl === '' || $model === '') {
            throw new RuntimeException('Local Ollama AI is not configured.');
        }

        $payload = [
            'model' => $model,
            'messages' => $messages,
            'stream' => false,
            'think' => false,
            'keep_alive' => Arr::get($options, 'keep_alive', config('services.ollama.keep_alive', '24h')),
            'options' => [
                'temperature' => Arr::get($options, 'temperature', 0.2),
                'top_p' => Arr::get($options, 'top_p', 0.9),
                'num_predict' => Arr::get($options, 'max_tokens', 700),
                'num_ctx' => Arr::get($options, 'num_ctx', 4096),
            ],
        ];

        $response = Http::acceptJson()->asJson()
            ->timeout(max(30, $timeout))
            ->post($baseUrl . '/api/chat', $payload);

        if ($response->failed()) {
            throw new RuntimeException('Local Ollama request failed with status ' . $response->status() . '.');
        }

        $content = $response->json('message.content');
        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('Local Ollama returned empty content.');
        }

        return [
            'choices' => [[ 'message' => ['content' => trim($content)] ]],
            'provider' => 'ollama',
            'model' => $response->json('model', $model),
        ];
    }
}
