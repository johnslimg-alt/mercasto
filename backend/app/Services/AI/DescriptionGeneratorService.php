<?php

namespace App\Services\AI;

class DescriptionGeneratorService
{
    private OllamaClient $ollama;

    public function __construct(OllamaClient $ollama)
    {
        $this->ollama = $ollama;
    }

    /**
     * Generate professional listing description
     */
    public function generate(array $listingData): array
    {
        $title = $listingData['title'] ?? '';
        $category = $listingData['category'] ?? '';
        $condition = $listingData['condition'] ?? 'used';
        $price = $listingData['price'] ?? 0;
        $attributes = $listingData['attributes'] ?? [];
        $keyFeatures = $listingData['key_features'] ?? [];

        if (empty($title)) {
            return [
                'success' => false,
                'error' => 'Title is required',
            ];
        }

        $prompt = $this->buildDescriptionPrompt($listingData);
        
        $system = "Eres un copywriter experto en marketplaces mexicanos. " .
                  "Genera descripciones profesionales, atractivas y honestas que generen confianza. " .
                  "Usa español mexicano natural. Incluye detalles técnicos relevantes. " .
                  "Estructura: 1) Introducción atractiva, 2) Características principales, " .
                  "3) Estado y detalles, 4) Call-to-action. " .
                  "Longitud: 100-250 palabras. No uses emojis excesivos.";

        $result = $this->ollama->generate($prompt, $system, [
            'temperature' => 0.7,
            'max_tokens' => 600,
        ]);

        if (!$result['success']) {
            return $this->fallbackDescription($listingData);
        }

        $description = $this->cleanAndFormat($result['response']);

        return [
            'success' => true,
            'description' => $description,
            'word_count' => str_word_count($description),
            'generation_time_ms' => round($result['total_duration'] / 1000000),
            'model' => $result['model'],
        ];
    }

    /**
     * Generate multiple description variants
     */
    public function generateVariants(array $listingData, int $count = 3): array
    {
        $variants = [];

        for ($i = 0; $i < $count; $i++) {
            $variants[] = $this->generate($listingData);
        }

        return [
            'success' => true,
            'variants' => $variants,
            'count' => count($variants),
        ];
    }

    /**
     * Improve existing description
     */
    public function improve(string $existingDescription, array $listingData): array
    {
        $prompt = "Mejora esta descripción de producto manteniendo la información original:\n\n";
        $prompt .= "DESCRIPCIÓN ACTUAL:\n{$existingDescription}\n\n";
        $prompt .= "DATOS DEL PRODUCTO:\n";
        $prompt .= "- Título: {$listingData['title']}\n";
        $prompt .= "- Categoría: {$listingData['category']}\n";
        $prompt .= "- Precio: \${$listingData['price']}\n\n";
        $prompt .= "Genera una versión mejorada, más profesional y atractiva.";

        $system = "Eres un editor experto. Mejora la descripción manteniendo todos los datos originales. " .
                  "Hazla más profesional, clara y persuasiva. Usa español mexicano.";

        $result = $this->ollama->generate($prompt, $system, [
            'temperature' => 0.6,
            'max_tokens' => 600,
        ]);

        if (!$result['success']) {
            return [
                'success' => false,
                'error' => 'Failed to improve description',
            ];
        }

        return [
            'success' => true,
            'original' => $existingDescription,
            'improved' => $this->cleanAndFormat($result['response']),
            'generation_time_ms' => round($result['total_duration'] / 1000000),
        ];
    }

    /**
     * Build description generation prompt
     */
    private function buildDescriptionPrompt(array $data): string
    {
        $prompt = "Genera una descripción profesional para este anuncio:\n\n";
        
        $prompt .= "INFORMACIÓN DEL PRODUCTO:\n";
        $prompt .= "- Título: {$data['title']}\n";
        $prompt .= "- Categoría: {$data['category']}\n";
        
        if (!empty($data['subcategory'])) {
            $prompt .= "- Subcategoría: {$data['subcategory']}\n";
        }
        
        $prompt .= "- Estado: {$data['condition']}\n";
        $prompt .= "- Precio: \${$data['price']} MXN\n\n";

        if (!empty($data['attributes'])) {
            $prompt .= "CARACTERÍSTICAS TÉCNICAS:\n";
            foreach ($data['attributes'] as $key => $value) {
                $prompt .= "- {$key}: {$value}\n";
            }
            $prompt .= "\n";
        }

        if (!empty($data['key_features'])) {
            $prompt .= "PUNTOS CLAVE:\n";
            foreach ($data['key_features'] as $feature) {
                $prompt .= "- {$feature}\n";
            }
            $prompt .= "\n";
        }

        $prompt .= "Genera una descripción atractiva y profesional que:\n";
        $prompt .= "1. Capture la atención del comprador\n";
        $prompt .= "2. Destaque las características principales\n";
        $prompt .= "3. Sea honesta sobre el estado del producto\n";
        $prompt .= "4. Incluya un call-to-action al final\n";
        $prompt .= "5. Use español mexicano natural\n";

        return $prompt;
    }

    /**
     * Clean and format AI response
     */
    private function cleanAndFormat(string $response): string
    {
        // Remove markdown formatting if present
        $response = preg_replace('/\*\*(.+?)\*\*/', '$1', $response);
        $response = preg_replace('/\*(.+?)\*/', '$1', $response);
        
        // Remove excessive line breaks
        $response = preg_replace("/\n{3,}/", "\n\n", $response);
        
        // Trim whitespace
        $response = trim($response);

        return $response;
    }

    /**
     * Fallback description when AI fails
     */
    private function fallbackDescription(array $data): array
    {
        $title = $data['title'];
        $category = $data['category'];
        $condition = $data['condition'];
        $price = $data['price'];

        $description = "Se vende {$title} en excelente estado.\n\n";
        $description .= "Categoría: {$category}\n";
        $description .= "Estado: {$condition}\n";
        $description .= "Precio: \${$price} MXN\n\n";

        if (!empty($data['attributes'])) {
            $description .= "Características:\n";
            foreach ($data['attributes'] as $key => $value) {
                $description .= "- {$key}: {$value}\n";
            }
            $description .= "\n";
        }

        $description .= "¡Contáctame para más información!";

        return [
            'success' => true,
            'description' => $description,
            'word_count' => str_word_count($description),
            'generation_time_ms' => 0,
            'model' => 'fallback',
        ];
    }
}
