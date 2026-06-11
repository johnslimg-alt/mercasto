<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class OllamaClient
{
    private string $baseUrl;
    private string $defaultModel;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('services.ollama.url', 'http://mercasto_ollama:11434');
        $this->defaultModel = config('services.ollama.model', 'qwen2.5-coder:1.5b');
        $this->timeout = config('services.ollama.timeout', 60);
    }

    /**
     * Generate text completion
     */
    public function generate(
        string $prompt,
        ?string $system = null,
        array $options = []
    ): array {
        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'prompt' => $prompt,
            'stream' => false,
            'options' => [
                'temperature' => $options['temperature'] ?? 0.7,
                'top_p' => $options['top_p'] ?? 0.9,
                'num_predict' => $options['max_tokens'] ?? 500,
            ],
        ];

        if ($system) {
            $payload['system'] = $system;
        }

        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/generate", $payload);

            if (!$response->successful()) {
                Log::error('Ollama API error', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                return ['success' => false, 'error' => 'AI service unavailable'];
            }

            $data = $response->json();
            
            return [
                'success' => true,
                'response' => $data['response'] ?? '',
                'model' => $data['model'] ?? $this->defaultModel,
                'total_duration' => $data['total_duration'] ?? 0,
                'eval_count' => $data['eval_count'] ?? 0,
            ];

        } catch (\Exception $e) {
            Log::error('Ollama client error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Chat completion (multi-turn conversation)
     */
    public function chat(
        array $messages,
        array $options = []
    ): array {
        $payload = [
            'model' => $options['model'] ?? $this->defaultModel,
            'messages' => $messages,
            'stream' => false,
            'options' => [
                'temperature' => $options['temperature'] ?? 0.7,
                'top_p' => $options['top_p'] ?? 0.9,
                'num_predict' => $options['max_tokens'] ?? 500,
            ],
        ];

        try {
            $response = Http::timeout($this->timeout)
                ->post("{$this->baseUrl}/api/chat", $payload);

            if (!$response->successful()) {
                return ['success' => false, 'error' => 'AI service unavailable'];
            }

            $data = $response->json();
            
            return [
                'success' => true,
                'message' => $data['message'] ?? [],
                'model' => $data['model'] ?? $this->defaultModel,
                'total_duration' => $data['total_duration'] ?? 0,
            ];

        } catch (\Exception $e) {
            Log::error('Ollama chat error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Check if Ollama is available
     */
    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/api/tags");
            return $response->successful();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get available models
     */
    public function getModels(): array
    {
        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/api/tags");
            
            if (!$response->successful()) {
                return [];
            }

            $data = $response->json();
            return $data['models'] ?? [];

        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Cached generation (for repeated prompts)
     */
    public function generateCached(
        string $prompt,
        ?string $system = null,
        array $options = [],
        int $ttl = 3600
    ): array {
        $cacheKey = 'ollama:' . md5($prompt . $system . json_encode($options));
        
        return Cache::remember($cacheKey, $ttl, function () use ($prompt, $system, $options) {
            return $this->generate($prompt, $system, $options);
        });
    }

    /**
     * Generate embedding vector for text using nomic-embed-text model
     * Returns 768-dimensional vector for semantic search
     */
    public function embed(string $text): ?array
    {
        $cacheKey = 'embedding_' . md5($text);
        
        return Cache::remember($cacheKey, 3600 * 24, function () use ($text) {
            try {
                $response = Http::timeout(30)
                    ->post("{$this->baseUrl}/api/embeddings", [
                        'model' => 'nomic-embed-text:latest',
                        'prompt' => $text,
                    ]);

                if (!$response->successful()) {
                    Log::warning('Embedding failed', ['status' => $response->status()]);
                    return null;
                }

                $data = $response->json();
                return $data['embedding'] ?? null;
            } catch (\Exception $e) {
                Log::error('Embedding error', ['error' => $e->getMessage()]);
                return null;
            }
        });
    }

    /**
     * Batch embed multiple texts
     */
    public function batchEmbed(array $texts): array
    {
        $results = [];
        foreach ($texts as $text) {
            $results[] = $this->embed($text);
        }
        return $results;
    }

}
