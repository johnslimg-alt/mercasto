<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    /**
     * Generate an ad description from text fields (title, category, price, location).
     * Google Gemini is the remote provider for this endpoint.
     */
    public function generateDescription(Request $request)
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

        $geminiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$geminiKey) {
            return response()->json(['message' => 'No AI API key configured.'], 501);
        }

        $model = config('services.gemini.text_model', 'gemini-2.5-flash-lite');

        try {
            $res = Http::timeout(15)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$geminiKey}",
                [
                    'contents' => [[
                        'parts' => [['text' => $prompt]],
                    ]],
                ]
            );

            if ($res->successful()) {
                $text = $res->json('candidates.0.content.parts.0.text');

                return response()->json([
                    'description' => trim((string) $text),
                    'provider'    => 'gemini',
                    'model'       => $model,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Gemini text AI Error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Error al generar descripción con IA.'], 500);
    }
}
