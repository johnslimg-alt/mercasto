<?php

namespace App\Services;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class DeepSeekClient
{
    public function chatFlash(array $messages, array $options = []): array
    {
        return $this->chat(
            (string) config('services.deepseek.fast_model', 'deepseek-v4-flash'),
            $messages,
            $options,
            (int) Arr::get($options, 'timeout', 15)
        );
    }

    public function chatPro(array $messages, array $options = []): array
    {
        return $this->chat(
            (string) config('services.deepseek.pro_model', 'deepseek-v4-pro'),
            $messages,
            $options,
            (int) Arr::get($options, 'timeout', 45)
        );
    }

    private function chat(string $model, array $messages, array $options, int $timeout): array
    {
        $apiKey = (string) config('services.deepseek.api_key', '');
        $baseUrl = rtrim((string) config('services.deepseek.base_url', 'https://api.deepseek.com'), '/');

        if ($messages === []) {
            throw new RuntimeException('DeepSeek messages cannot be empty.');
        }

        if ($apiKey === '') {
            return $this->chatOllama($messages, $options, $timeout, 'DeepSeek API key is not configured.');
        }

        if ($model === '') {
            return $this->chatOllama($messages, $options, $timeout, 'DeepSeek model is not configured.');
        }

        $payload = array_filter([
            'model' => $model,
            'messages' => $messages,
            'thinking' => [
                'type' => Arr::get($options, 'thinking', 'disabled'),
            ],
            'response_format' => Arr::get($options, 'response_format'),
            'temperature' => Arr::get($options, 'temperature', 0.2),
            'max_tokens' => Arr::get($options, 'max_tokens', 700),
            'stream' => false,
        ], static fn ($value) => $value !== null);

        $response = Http::withToken($apiKey)
            ->acceptJson()
            ->asJson()
            ->timeout($timeout)
            ->retry(1, 250, throw: false)
            ->post($baseUrl . '/chat/completions', $payload);

        if ($response->failed()) {
            return $this->chatOllama(
                $messages,
                $options,
                $timeout,
                sprintf('DeepSeek request failed with status %s.', $response->status())
            );
        }

        $json = $response->json();

        if (! is_array($json)) {
            return $this->chatOllama($messages, $options, $timeout, 'DeepSeek response was not valid JSON.');
        }

        $content = data_get($json, 'choices.0.message.content');
        if (! is_string($content) || trim($content) === '') {
            return $this->chatOllama($messages, $options, $timeout, 'DeepSeek response did not include usable content.');
        }

        return $json;
    }

    private function chatOllama(array $messages, array $options, int $timeout, string $reason): array
    {
        $baseUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');
        $model = (string) config('services.ollama.chat_model', 'qwen2.5:1.5b');

        if ($baseUrl === '' || $model === '') {
            throw new RuntimeException($reason . ' Ollama fallback is not configured.');
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
            throw new RuntimeException($reason . ' Ollama fallback failed with status ' . $response->status() . '.');
        }

        $content = $response->json('message.content');

        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException($reason . ' Ollama fallback returned empty content.');
        }

        return [
            'choices' => [
                [
                    'message' => [
                        'content' => trim($content),
                    ],
                ],
            ],
            'provider' => 'ollama',
            'model' => $model,
        ];
    }
}
