<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LocalAiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class AiDescriptionController extends Controller
{
    public function __invoke(Request $request, LocalAiClient $ai): JsonResponse
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
            $description = $this->generateWithLocalAi($ai, $facts);

            return response()->json(['description' => $this->guardDescription($description, $request)]);
        } catch (Throwable $aiError) {
            Log::error('Local AI description failed', [
                'user_id' => $request->user()->id,
                'error' => $aiError->getMessage(),
            ]);
        }


        return response()->json(['error' => 'No se pudo generar la descripción. Inténtalo de nuevo.'], 500);
    }

    private function generateWithLocalAi(LocalAiClient $ai, string $facts): string
    {
        $result = $ai->chatFlash(
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
            ['max_tokens' => 140, 'temperature' => 0, 'timeout' => 90, 'num_ctx' => 2048]
        );

        $description = trim((string) ($result['choices'][0]['message']['content'] ?? ''));
        if ($description === '') {
            throw new RuntimeException('Empty response from local AI.');
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
        return 'Redactas anuncios para Mercasto.com. Regla principal: usa SOLO los datos confirmados por el usuario. Prohibido inventar color, batería, accesorios, garantía, factura, caja, cargador, rayones, golpes, envíos o entregas si no están en los datos. No añadas características, componentes, rendimiento, estado o beneficios que no estén explícitamente en los datos. Si faltan detalles, invita a preguntar. Responde solo la descripción en español mexicano profesional.';
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
