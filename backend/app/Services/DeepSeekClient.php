<?php

namespace App\Services;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Backwards-compatible adapter kept for existing callers.
 *
 * Privacy rule: all generation is local through Ollama. No user content is
 * transmitted to DeepSeek or any other external AI provider.
 */
class DeepSeekClient
{
    public function chatFlash(array $messages, array $options = []): array
    {
        return $this->chatLocal($messages, $options, (int) Arr::get($options, 'timeout', 45));
    }

    public function chatPro(array $messages, array $options = []): array
    {
        return $this->chatLocal($messages, $options, (int) Arr::get($options, 'timeout', 60));
    }

    private function chatLocal(array $messages, array $options, int $timeout): array
    {
        if ($messages === []) {
            throw new RuntimeException('AI messages cannot be empty.');
        }

        $baseUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');
        $model = (string) config('services.ollama.chat_model', 'qwen3-vl:4b');

        if ($baseUrl === '' || $model === '') {
            throw new RuntimeException('Local Ollama AI is not configured.');
        }

        $response = Http::acceptJson()
            ->asJson()
            ->timeout(max($timeout, 45))
            ->post($baseUrl . '/api/chat', [
                'model' => $model,
                'messages' => $messages,
                'stream' => false,
                'options' => [
                    'temperature' => Arr::get($options, 'temperature', 0.2),
                    'num_predict' => Arr::get($options, 'max_tokens', 700),
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Local Ollama request failed with status ' . $response->status() . '.');
        }

        $content = $response->json('message.content');
        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('Local Ollama returned empty content.');
        }

        return [
            'choices' => [[
                'message' => ['content' => trim($content)],
            ]],
            'provider' => 'ollama',
            'model' => $model,
        ];
    }
}
