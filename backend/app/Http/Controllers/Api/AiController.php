<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DeepSeekClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AiController extends Controller
{
    /**
     * Generate an ad description using the private local AI provider.
     * Existing DeepSeekClient name is a compatibility adapter; it is local-only.
     */
    public function generateDescription(Request $request, DeepSeekClient $ai)
    {
        $request->validate([
            'title'    => 'required|string|max:200',
            'category' => 'required|string',
            'price'    => 'nullable|numeric',
            'location' => 'nullable|string',
        ]);

        $prompt  = "Eres un experto en marketing para marketplace mexicano (Mercasto.com). ";
        $prompt .= "Genera una descripción atractiva y persuasiva de 2-3 oraciones para este anuncio:\n";
        $prompt .= "Título: {$request->title}\n";
        $prompt .= "Categoría: {$request->category}\n";
        if ($request->price)    $prompt .= "Precio: {$request->price} MXN\n";
        if ($request->location) $prompt .= "Ubicación: {$request->location}\n";
        $prompt .= "\nEscribe solo la descripción, sin introducción ni comillas. En español mexicano. Máximo 150 palabras.";

        try {
            $result = $ai->chatFlash([
                ['role' => 'user', 'content' => $prompt],
            ], [
                'temperature' => 0.2,
                'max_tokens' => 220,
                'timeout' => 45,
            ]);

            $text = data_get($result, 'choices.0.message.content');
            if (is_string($text) && trim($text) !== '') {
                return response()->json([
                    'description' => trim($text),
                    'provider' => 'ollama',
                    'model' => $result['model'] ?? config('services.ollama.chat_model'),
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Local text AI error', ['error' => $e->getMessage()]);
        }

        return response()->json(['message' => 'Error al generar descripción con IA.'], 500);
    }
}
