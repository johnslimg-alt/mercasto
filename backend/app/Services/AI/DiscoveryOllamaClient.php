<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class DiscoveryOllamaClient extends OllamaClient
{
    public function embed(string $text): ?array
    {
        $model = (string) config('discovery.semantic.model', 'nomic-embed-text:latest');
        $dimensions = max(1, (int) config('discovery.semantic.dimensions', 768));
        $timeout = max(1, min(15, (int) config('discovery.semantic.timeout_seconds', 5)));
        $cacheKey = 'embedding:'.hash('sha256', $model."\0".$text);

        return Cache::remember($cacheKey, now()->addDay(), function () use ($text, $model, $dimensions, $timeout) {
            try {
                $baseUrl = rtrim((string) config('services.ollama.url', 'http://mercasto_ollama:11434'), '/');
                $response = Http::timeout($timeout)->post($baseUrl.'/api/embeddings', [
                    'model' => $model,
                    'prompt' => $text,
                ]);
                $embedding = $response->successful() ? $response->json('embedding') : null;
                if (! is_array($embedding) || count($embedding) !== $dimensions) {
                    Log::warning('Discovery embedding contract mismatch', [
                        'status' => $response->status(),
                        'received_dimensions' => is_array($embedding) ? count($embedding) : null,
                        'expected_dimensions' => $dimensions,
                    ]);

                    return null;
                }

                return $embedding;
            } catch (Throwable $exception) {
                Log::warning('Discovery embedding unavailable', ['exception' => $exception::class]);

                return null;
            }
        });
    }
}
