<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    /**
     * Generate an ad description from text fields (title, category, price, location).
     * Primary: Anthropic Claude (if ANTHROPIC_API_KEY is set)
     * Fallback: Google Gemini (GEMINI_API_KEY)
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
        if ($request->price)    $prompt .= "Precio: {->price} MXN\n";
        if ($request->location) $prompt .= "Ubicación: {$request->location}\n";
        $prompt .= "\nEscribe solo la descripción, sin introducción ni comillas. En español mexicano. Máximo 150 palabras.";

        // --- Anthropic Claude (preferred when key is configured) ---
        $anthropicKey = config('services.anthropic.api_key', env('ANTHROPIC_API_KEY'));
        if ($anthropicKey) {
            try {
                $res = Http::timeout(15)->withHeaders([
                    'x-api-key'         => $anthropicKey,
                    'anthropic-version' => '2023-06-01',
                    'content-type'      => 'application/json',
                ])->post('https://api.anthropic.com/v1/messages', [
                    'model'      => 'claude-haiku-4-5-20251001',
                    'max_tokens' => 220,
                    'messages'   => [['role' => 'user', 'content' => $prompt]],
                ]);
                if ($res->successful()) {
                    return response()->json([
                        'description' => trim($res->json('content.0.text')),
                        'provider'    => 'anthropic',
                    ]);
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Anthropic AI failed, falling back to Gemini: ' . $e->getMessage());
            }
        }

        // --- Google Gemini (fallback / default) ---
        $geminiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$geminiKey) {
            return response()->json(['message' => 'No AI API key configured.'], 501);
        }

        try {
            $res = Http::timeout(15)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiKey}",
                [
                    'contents' => [[
                        'parts' => [['text' => $prompt]]
                    ]]
                ]
            );
            if ($res->successful()) {
                $text = $res->json('candidates.0.content.parts.0.text');
                return response()->json([
                    'description' => trim($text),
                    'provider'    => 'gemini',
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Gemini text AI Error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Error al generar descripción con IA.'], 500);
    }
}
