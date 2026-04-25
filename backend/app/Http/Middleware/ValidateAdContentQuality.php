<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateAdContentQuality
{
    public function handle(Request $request, Closure $next): Response
    {
        $title = trim((string) $request->input('title', ''));
        $description = trim((string) $request->input('description', ''));

        $errors = [];

        if ($this->looksLikeJunk($title, 4)) {
            $errors['title'][] = 'El título parece ser de prueba o no describe el producto. Escribe un título real, por ejemplo: iPhone 13 usado en buen estado.';
        }

        if ($this->looksLikeJunk($description, 10)) {
            $errors['description'][] = 'La descripción parece ser de prueba o demasiado corta. Agrega detalles reales del producto o servicio.';
        }

        if (!empty($errors)) {
            return response()->json([
                'message' => 'El anuncio necesita información más clara antes de publicarse.',
                'errors' => $errors,
            ], 422);
        }

        return $next($request);
    }

    private function looksLikeJunk(string $value, int $minLength): bool
    {
        $normalized = trim(preg_replace('/\s+/u', ' ', $value) ?? '');
        $compact = preg_replace('/\s+/u', '', $normalized) ?? '';
        $lettersOnly = preg_replace('/[^\p{L}]/u', '', mb_strtolower($normalized)) ?? '';
        $digitsOnly = preg_replace('/\D/u', '', $normalized) ?? '';

        if (mb_strlen($normalized) < $minLength) {
            return true;
        }

        if ($digitsOnly !== '' && $compact === $digitsOnly) {
            return true;
        }

        if (preg_match('/^(.)\1{3,}$/u', $compact)) {
            return true;
        }

        $lower = mb_strtolower($normalized);
        $blockedPlaceholders = [
            'test',
            'testing',
            'prueba',
            'demo',
            'asdf',
            'qwerty',
            'wrefrg',
            'lorem ipsum',
        ];

        foreach ($blockedPlaceholders as $placeholder) {
            if (str_contains($lower, $placeholder)) {
                return true;
            }
        }

        if (mb_strlen($lettersOnly) >= 5 && !str_contains($normalized, ' ')) {
            $vowels = preg_match_all('/[aeiouáéíóúü]/u', $lettersOnly);
            $vowelRatio = $vowels / max(1, mb_strlen($lettersOnly));

            if ($vowelRatio < 0.2) {
                return true;
            }
        }

        return false;
    }
}
