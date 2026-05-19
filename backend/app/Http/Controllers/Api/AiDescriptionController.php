<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DeepSeekClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Throwable;

class AiDescriptionController extends Controller
{
    public function __invoke(Request $request, DeepSeekClient $deepSeek): JsonResponse
    {
        $user = $request->user();
        $rateKey = 'ai-description:' . ($user?->id ?? $request->ip());

        if (RateLimiter::tooManyAttempts($rateKey, 10)) {
            return response()->json([
                'error' => 'Has alcanzado el límite de generación con IA. Intenta de nuevo más tarde.',
                'retry_after' => RateLimiter::availableIn($rateKey),
            ], 429);
        }

        RateLimiter::hit($rateKey, 3600);

        $data = $request->validate([
            'title' => 'required|string|min:3|max:120',
            'category' => 'nullable|string|max:120',
            'condition' => 'nullable|string|max:60',
            'price' => 'nullable|numeric|min:0|max:999999999',
            'attributes' => 'nullable|array|max:30',
            'attributes.*' => 'nullable|string|max:120',
        ]);

        $promptPayload = [
            'titulo' => $data['title'],
            'categoria' => $data['category'] ?? null,
            'condicion' => $data['condition'] ?? null,
            'precio_mxn' => $data['price'] ?? null,
            'atributos' => $data['attributes'] ?? [],
        ];

        try {
            return response()->json(['description' => $this->generateWithDeepSeek($deepSeek, $promptPayload, $user?->id)]);
        } catch (Throwable $deepSeekError) {
            Log::warning('DeepSeek AI description failed; trying Ollama fallback', [
                'user_id' => $user?->id,
                'error' => $deepSeekError->getMessage(),
            ]);
        }

        try {
            return response()->json(['description' => $this->generateWithOllama($promptPayload, $user?->id)]);
        } catch (Throwable $ollamaError) {
            Log::error('AI description generation failed', [
                'providers' => ['deepseek', 'ollama'],
                'user_id' => $user?->id,
                'error' => $ollamaError->getMessage(),
            ]);

            return response()->json([
                'error' => 'No se pudo generar la descripción con IA en este momento. Puedes escribirla manualmente e intentar de nuevo después.',
            ], 500);
        }
    }

    private function generateWithDeepSeek(DeepSeekClient $deepSeek, array $promptPayload, ?int $userId): string
    {
        $messages = [
            [
                'role' => 'system',
                'content' => $this->systemPrompt(),
            ],
            [
                'role' => 'user',
                'content' => 'Genera una descripción vendedora, clara y confiable para este anuncio: ' . json_encode($promptPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ],
        ];

        $response = $deepSeek->chatFlash($messages, [
            'max_tokens' => 260,
            'temperature' => 0.35,
            'timeout' => 30,
            'thinking' => 'disabled',
        ]);

        $description = $this->cleanDescription((string) ($response['choices'][0]['message']['content'] ?? ''));

        if ($description === '') {
            throw new \RuntimeException('DeepSeek returned empty description.');
        }

        Log::info('AI description generated', ['provider' => 'deepseek', 'user_id' => $userId]);

        return $description;
    }

    private function generateWithOllama(array $promptPayload, ?int $userId): string
    {
        $baseUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');
        $model = (string) config('services.ollama.description_model', 'qwen2.5:1.5b');

        $prompt = $this->systemPrompt() . "\n\nAnuncio: " . json_encode($promptPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $response = Http::acceptJson()
            ->asJson()
            ->timeout((int) config('services.ollama.timeout', 45))
            ->post($baseUrl . '/api/generate', [
                'model' => $model,
                'prompt' => $prompt,
                'stream' => false,
                'options' => [
                    'temperature' => 0.35,
                    'num_predict' => 220,
                ],
            ]);

        if ($response->failed()) {
            throw new \RuntimeException('Ollama request failed with status ' . $response->status() . '.');
        }

        $description = $this->cleanDescription((string) ($response->json('response') ?? ''));

        if ($description === '') {
            throw new \RuntimeException('Ollama returned empty description.');
        }

        Log::info('AI description generated', ['provider' => 'ollama', 'model' => $model, 'user_id' => $userId]);

        return $description;
    }

    private function systemPrompt(): string
    {
        return 'Eres redactor experto para Mercasto.com, marketplace de anuncios clasificados en México. Escribe solo una descripción final en español mexicano natural. No uses markdown, no inventes datos técnicos no proporcionados, no menciones IA, no uses emojis excesivos. Máximo 150 palabras. Si faltan datos, sé general y honesto.';
    }

    private function cleanDescription(string $description): string
    {
        return Str::of($description)
            ->replace(['```', '"""'], '')
            ->trim()
            ->limit(1200, '')
            ->toString();
    }
}
