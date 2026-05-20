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
use RuntimeException;
use Throwable;

class AiDescriptionController extends Controller
{
    public function __invoke(Request $request, DeepSeekClient $deepSeek): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|min:3|max:200',
            'category' => 'nullable|string|max:100',
            'condition' => 'nullable|string|max:50',
            'location' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0|max:999999999',
            'attributes' => 'nullable|array|max:30',
        ]);

        $rateLimitKey = 'ai-desc:' . $request->user()->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
            return response()->json([
                'error' => 'Límite de generaciones alcanzado. Inténtalo en ' . RateLimiter::availableIn($rateLimitKey) . ' segundos.',
            ], 429);
        }
        RateLimiter::hit($rateLimitKey, 3600);

        $facts = $this->factsFromRequest($request);

        try {
            $description = $this->generateWithDeepSeek($deepSeek, $facts);

            return response()->json(['description' => $this->guardDescription($description, $request)]);
        } catch (Throwable $deepSeekError) {
            Log::warning('DeepSeek description failed; trying Ollama fallback', [
                'user_id' => $request->user()->id,
                'error' => $deepSeekError->getMessage(),
            ]);
        }

        try {
            $description = $this->generateWithOllama($facts);

            return response()->json(['description' => $this->guardDescription($description, $request)]);
        } catch (Throwable $ollamaError) {
            Log::error('AI description generation failed', [
                'providers' => ['deepseek', 'ollama'],
                'user_id' => $request->user()->id,
                'error' => $ollamaError->getMessage(),
            ]);

            return response()->json([
                'error' => 'No se pudo generar la descripción. Inténtalo de nuevo.',
            ], 500);
        }
    }

    private function generateWithDeepSeek(DeepSeekClient $deepSeek, string $facts): string
    {
        $result = $deepSeek->chatFlash(
            [
                [
                    'role' => 'system',
                    'content' => $this->systemPrompt(),
                ],
                [
                    'role' => 'user',
                    'content' => "Datos confirmados:\n{$facts}\nEscribe una descripción atractiva, honesta y breve. Máximo 100 palabras.",
                ],
            ],
            ['max_tokens' => 160, 'temperature' => 0, 'timeout' => 30, 'thinking' => 'disabled']
        );

        $description = trim((string) ($result['choices'][0]['message']['content'] ?? ''));
        if ($description === '') {
            throw new RuntimeException('Empty response from DeepSeek.');
        }

        return $description;
    }

    private function generateWithOllama(string $facts): string
    {
        $response = Http::acceptJson()
            ->asJson()
            ->timeout(45)
            ->post('http://ollama:11434/api/generate', [
                'model' => 'qwen2.5:1.5b',
                'prompt' => $this->systemPrompt() . "\n\nDatos confirmados:\n{$facts}\nEscribe una descripción atractiva, honesta y breve. Máximo 100 palabras.",
                'stream' => false,
                'options' => [
                    'temperature' => 0.25,
                    'num_predict' => 180,
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Ollama request failed with status ' . $response->status() . '.');
        }

        $description = trim((string) ($response->json('response') ?? ''));
        if ($description === '') {
            throw new RuntimeException('Empty response from Ollama.');
        }

        return $description;
    }

    private function factsFromRequest(Request $request): string
    {
        $facts = "Título: {$request->title}\n";
        if ($request->category) {
            $facts .= "Categoría: {$request->category}\n";
        }
        if ($request->condition) {
            $facts .= "Condición: {$request->condition}\n";
        }
        if ($request->location) {
            $facts .= "Ubicación: {$request->location}\n";
        }
        if ($request->price) {
            $facts .= "Precio: \${$request->price} MXN\n";
        }
        if (is_array($request->attributes)) {
            foreach ($request->attributes as $attrKey => $attrValue) {
                if (is_scalar($attrValue) && $attrValue !== '') {
                    $facts .= ucfirst((string) $attrKey) . ": {$attrValue}\n";
                }
            }
        }

        return $facts;
    }

    private function systemPrompt(): string
    {
        return 'Redactas anuncios para Mercasto.com. Regla principal: usa SOLO los datos confirmados por el usuario. Prohibido inventar color, batería, accesorios, garantía, factura, caja, cargador, rayones, golpes, envíos o entregas si no están en los datos. Si faltan detalles, invita a preguntar. Responde solo la descripción en español mexicano profesional.';
    }

    private function guardDescription(string $description, Request $request): string
    {
        $description = Str::of($description)->replace(['```', '"""'], '')->trim()->limit(1200, '')->toString();

        if ($description === '' || $this->containsUnsupportedAiClaims($description, $request)) {
            return $this->safeGeneratedDescription($request);
        }

        return $description;
    }

    private function containsUnsupportedAiClaims(string $description, Request $request): bool
    {
        $source = Str::lower(implode(' ', array_filter([
            $request->title,
            $request->category,
            $request->condition,
            $request->location,
            $request->price,
            is_array($request->attributes) ? json_encode($request->attributes, JSON_UNESCAPED_UNICODE) : null,
        ])));
        $text = Str::lower($description);

        foreach ([
            'batería', 'bateria', 'caja', 'cable', 'cargador', 'garantía', 'garantia',
            'factura', 'rayones', 'golpes', 'funda', 'mica', 'color', 'negro', 'blanco',
            'morado', 'azul', 'rojo', 'dorado', 'plata', 'gris', 'envío', 'envio',
            'entrega', 'original',
        ] as $term) {
            if (Str::contains($text, $term) && ! Str::contains($source, $term)) {
                return true;
            }
        }

        return false;
    }

    private function safeGeneratedDescription(Request $request): string
    {
        $title = trim(strip_tags((string) $request->title));
        $parts = ["Vendo {$title} en Mercasto."];

        if ($request->condition) {
            $parts[] = 'Condición: ' . trim(strip_tags((string) $request->condition)) . '.';
        }

        if ($request->price) {
            $parts[] = 'Precio: $' . number_format((float) $request->price, 0) . ' MXN.';
        }

        if ($request->location) {
            $parts[] = 'Disponible en ' . trim(strip_tags((string) $request->location)) . '.';
        }

        $parts[] = 'Escríbeme para resolver dudas, pedir más información o coordinar la compra.';

        return implode(' ', $parts);
    }
}
