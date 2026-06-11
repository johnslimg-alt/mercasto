<?php

namespace App\Services\AI;

use App\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class PricingService
{
    private OllamaClient $ollama;

    public function __construct(OllamaClient $ollama)
    {
        $this->ollama = $ollama;
    }

    /**
     * Get AI-powered pricing suggestion for a listing
     */
    public function suggestPrice(array $listingData): array
    {
        $category = $listingData['category'] ?? '';
        $subcategory = $listingData['subcategory'] ?? '';
        $state = $listingData['state'] ?? '';
        $condition = $listingData['condition'] ?? 'used';
        $title = $listingData['title'] ?? '';
        $attributes = $listingData['attributes'] ?? [];

        // Get comparable listings from database
        $comparables = $this->getComparableListings($category, $subcategory, $state, 20);

        if (empty($comparables)) {
            return $this->fallbackSuggestion($category);
        }

        // Calculate statistics
        $stats = $this->calculateStats($comparables);

        // Use AI to analyze and suggest price
        $aiSuggestion = $this->getAISuggestion($listingData, $stats, $comparables);

        return [
            'success' => true,
            'suggested_price' => $aiSuggestion['price'],
            'price_range' => [
                'min' => $stats['min'],
                'max' => $stats['max'],
                'avg' => round($stats['avg']),
                'median' => $stats['median'],
            ],
            'confidence' => $aiSuggestion['confidence'],
            'reasoning' => $aiSuggestion['reasoning'],
            'comparables_count' => count($comparables),
            'market_data' => $stats,
        ];
    }

    /**
     * Get comparable listings from database
     */
    private function getComparableListings(string $category, string $subcategory, string $state, int $limit): array
    {
        $cacheKey = "pricing:comparables:{$category}:{$subcategory}:{$state}";
        
        return Cache::remember($cacheKey, 1800, function () use ($category, $subcategory, $state, $limit) {
            $query = Ad::query()
                ->where('status', 'active')
                ->whereNotNull('price')
                ->where('price', '>', 0);

            if ($category) {
                $query->where('category', $category);
            }

            if ($subcategory) {
                $query->where('subcategory', $subcategory);
            }

            if ($state) {
                $query->where('state', $state);
            }

            return $query->select('title', 'price', 'condition', 'created_at')
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->toArray();
        });
    }

    /**
     * Calculate price statistics
     */
    private function calculateStats(array $comparables): array
    {
        $prices = array_column($comparables, 'price');
        sort($prices);

        $count = count($prices);
        $min = min($prices);
        $max = max($prices);
        $avg = array_sum($prices) / $count;
        $median = $count % 2 === 0 
            ? ($prices[$count / 2 - 1] + $prices[$count / 2]) / 2 
            : $prices[intval($count / 2)];

        // Calculate percentiles
        $p25 = $prices[intval($count * 0.25)];
        $p75 = $prices[intval($count * 0.75)];

        return [
            'count' => $count,
            'min' => $min,
            'max' => $max,
            'avg' => $avg,
            'median' => $median,
            'p25' => $p25,
            'p75' => $p75,
            'std_dev' => $this->standardDeviation($prices, $avg),
        ];
    }

    /**
     * Calculate standard deviation
     */
    private function standardDeviation(array $values, float $mean): float
    {
        $variance = 0.0;
        foreach ($values as $value) {
            $variance += pow($value - $mean, 2);
        }
        return sqrt($variance / count($values));
    }

    /**
     * Get AI-powered price suggestion
     */
    private function getAISuggestion(array $listingData, array $stats, array $comparables): array
    {
        $prompt = $this->buildPricingPrompt($listingData, $stats, $comparables);
        
        $system = "Eres un experto en valoración de productos para marketplaces en México. " .
                  "Analiza los datos del mercado y sugiere un precio justo y competitivo. " .
                  "Responde SOLO con un JSON válido en este formato: " .
                  '{\"price\": numero, \"confidence\": \"high|medium|low\", \"reasoning\": \"explicacion breve\"}';

        $result = $this->ollama->generateCached($prompt, $system, [
            'temperature' => 0.3,
            'max_tokens' => 300,
        ], 1800);

        if (!$result['success']) {
            return [
                'price' => round($stats['median']),
                'confidence' => 'medium',
                'reasoning' => 'Basado en precio mediano del mercado',
            ];
        }

        return $this->parseAIResponse($result['response'], $stats);
    }

    /**
     * Build pricing analysis prompt
     */
    private function buildPricingPrompt(array $listingData, array $stats, array $comparables): string
    {
        $prompt = "Analiza este producto y sugiere un precio competitivo:\n\n";
        $prompt .= "PRODUCTO:\n";
        $prompt .= "- Título: {$listingData['title']}\n";
        $prompt .= "- Categoría: {$listingData['category']}\n";
        if (!empty($listingData['subcategory'])) {
            $prompt .= "- Subcategoría: {$listingData['subcategory']}\n";
        }
        $prompt .= "- Estado: {$listingData['condition']}\n";
        $prompt .= "- Ubicación: {$listingData['state']}\n\n";

        $prompt .= "DATOS DEL MERCADO ({$stats['count']} listings similares):\n";
        $prompt .= "- Precio mínimo: \${$stats['min']}\n";
        $prompt .= "- Precio máximo: \${$stats['max']}\n";
        $prompt .= "- Precio promedio: \$" . round($stats['avg']) . "\n";
        $prompt .= "- Precio mediano: \${$stats['median']}\n";
        $prompt .= "- Rango intercuartil (P25-P75): \${$stats['p25']} - \${$stats['p75']}\n\n";

        $prompt .= "EJEMPLOS RECIENTES:\n";
        foreach (array_slice($comparables, 0, 5) as $comp) {
            $prompt .= "- \"{$comp['title']}\" → \${$comp['price']} ({$comp['condition']})\n";
        }

        $prompt .= "\nSugiere un precio justo considerando el estado del producto y la competencia.";

        return $prompt;
    }

    /**
     * Parse AI response
     */
    private function parseAIResponse(string $response, array $stats): array
    {
        // Try to extract JSON from response
        if (preg_match('/\{.*\}/s', $response, $matches)) {
            $json = json_decode($matches[0], true);
            
            if ($json && isset($json['price'])) {
                return [
                    'price' => max($stats['min'], min($stats['max'], round($json['price']))),
                    'confidence' => $json['confidence'] ?? 'medium',
                    'reasoning' => $json['reasoning'] ?? 'Análisis AI completado',
                ];
            }
        }

        // Fallback to median
        return [
            'price' => round($stats['median']),
            'confidence' => 'medium',
            'reasoning' => 'Basado en precio mediano del mercado',
        ];
    }

    /**
     * Fallback suggestion when no comparables available
     */
    private function fallbackSuggestion(string $category): array
    {
        $defaults = [
            'Autos' => 150000,
            'Inmuebles' => 1500000,
            'Electrónica' => 5000,
            'Hogar' => 2000,
            'Moda' => 500,
            'Empleos' => 15000,
            'Servicios' => 3000,
        ];

        $price = $defaults[$category] ?? 5000;

        return [
            'success' => true,
            'suggested_price' => $price,
            'price_range' => [
                'min' => $price * 0.7,
                'max' => $price * 1.3,
                'avg' => $price,
                'median' => $price,
            ],
            'confidence' => 'low',
            'reasoning' => 'Estimación basada en categoría (datos limitados)',
            'comparables_count' => 0,
            'market_data' => [],
        ];
    }
}
