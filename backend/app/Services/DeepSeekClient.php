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

        if ($apiKey === '') {
            throw new RuntimeException('DeepSeek API key is not configured.');
        }

        if ($model === '') {
            throw new RuntimeException('DeepSeek model is not configured.');
        }

        if ($messages === []) {
            throw new RuntimeException('DeepSeek messages cannot be empty.');
        }

        $payload = array_filter([
            'model' => $model,
            'messages' => $messages,
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
            throw new RuntimeException(sprintf(
                'DeepSeek request failed with status %s.',
                $response->status()
            ));
        }

        $json = $response->json();

        if (! is_array($json)) {
            throw new RuntimeException('DeepSeek response was not valid JSON.');
        }

        return $json;
    }
}
