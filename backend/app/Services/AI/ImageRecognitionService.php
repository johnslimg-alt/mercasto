<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Facades\Image;

class ImageRecognitionService
{
    private OllamaClient $ollama;

    public function __construct(OllamaClient $ollama)
    {
        $this->ollama = $ollama;
    }

    /**
     * Analyze image and suggest category + attributes
     */
    public function analyze(string $imagePath, ?string $title = null): array
    {
        // Try AI-based analysis if title is provided
        if ($title) {
            $aiResult = $this->aiAnalysis($title, $imagePath);
            if ($aiResult['success']) {
                return $aiResult;
            }
        }

        // Fallback to filename-based analysis
        $filenameResult = $this->analyzeFromFilename($imagePath);
        
        // Get image metadata
        $metadata = $this->getImageMetadata($imagePath);

        return [
            'success' => true,
            'suggested_category' => $filenameResult['category'],
            'suggested_subcategory' => $filenameResult['subcategory'],
            'confidence' => $filenameResult['confidence'],
            'keywords' => $filenameResult['keywords'],
            'metadata' => $metadata,
            'source' => 'filename_analysis',
        ];
    }

    /**
     * AI-powered analysis using Ollama
     */
    private function aiAnalysis(string $title, string $imagePath): array
    {
        $filename = basename($imagePath);
        $extension = pathinfo($filename, PATHINFO_EXTENSION);
        
        $prompt = "Analiza este producto y sugiere la mejor categoría para un marketplace mexicano.\n\n";
        $prompt .= "TÍTULO DEL PRODUCTO: {$title}\n";
        $prompt .= "ARCHIVO DE IMAGEN: {$filename}\n\n";
        
        $prompt .= "CATEGORÍAS DISPONIBLES:\n";
        $prompt .= "- Autos (coches, motos, camiones, autopartes)\n";
        $prompt .= "- Inmuebles (casas, departamentos, terrenos, oficinas)\n";
        $prompt .= "- Electrónica (celulares, computadoras, tablets, cámaras, TVs)\n";
        $prompt .= "- Hogar (muebles, electrodomésticos, decoración, jardín)\n";
        $prompt .= "- Moda (ropa, zapatos, accesorios, relojes)\n";
        $prompt .= "- Deportes (bicicletas, equipo de gym, camping)\n";
        $prompt .= "- Empleo (ofertas de trabajo)\n";
        $prompt .= "- Servicios (profesionales, técnicos, freelance)\n\n";
        
        $prompt .= "Responde SOLO con JSON válido:\n";
        $prompt .= '{\"category\": \"nombre_categoría\", \"subcategory\": \"nombre_subcategoría\", ';
        $prompt .= '\"confidence\": \"high|medium|low\", \"keywords\": [\"keyword1\", \"keyword2\"], ';
        $prompt .= '\"attributes\": {\"atributo1\": \"valor1\"}}';

        $system = "Eres un experto en clasificación de productos para marketplaces. " .
                  "Analiza el título y sugiere la categoría más apropiada. " .
                  "Responde SOLO con JSON válido, sin texto adicional.";

        $result = $this->ollama->generateCached($prompt, $system, [
            'temperature' => 0.3,
            'max_tokens' => 300,
        ], 3600);

        if (!$result['success']) {
            return ['success' => false];
        }

        return $this->parseAIResponse($result['response']);
    }

    /**
     * Parse AI response
     */
    private function parseAIResponse(string $response): array
    {
        // Extract JSON from response
        if (preg_match('/\{.*\}/s', $response, $matches)) {
            $json = json_decode($matches[0], true);
            
            if ($json && isset($json['category'])) {
                return [
                    'success' => true,
                    'suggested_category' => $json['category'],
                    'suggested_subcategory' => $json['subcategory'] ?? null,
                    'confidence' => $json['confidence'] ?? 'medium',
                    'keywords' => $json['keywords'] ?? [],
                    'attributes' => $json['attributes'] ?? [],
                    'source' => 'ai_analysis',
                ];
            }
        }

        return ['success' => false];
    }

    /**
     * Analyze image from filename keywords
     */
    private function analyzeFromFilename(string $imagePath): array
    {
        $filename = strtolower(basename($imagePath));
        $filename = preg_replace('/[^a-z0-9]/', ' ', $filename);
        
        $categoryKeywords = [
            'Autos' => ['auto', 'carro', 'coche', 'vehiculo', 'moto', 'camion', 'nissan', 'chevrolet', 'ford', 'vw', 'volkswagen', 'honda', 'toyota'],
            'Inmuebles' => ['casa', 'departamento', 'depto', 'terreno', 'oficina', 'local', 'bodega', 'inmueble'],
            'Electrónica' => ['iphone', 'samsung', 'celular', 'laptop', 'computadora', 'tablet', 'ipad', 'macbook', 'tv', 'television', 'camara', 'playstation', 'xbox', 'nintendo'],
            'Hogar' => ['mueble', 'sofa', 'mesa', 'silla', 'cama', 'refrigerador', 'lavadora', 'estufa', 'decoracion', 'jardin'],
            'Moda' => ['ropa', 'camisa', 'pantalon', 'vestido', 'zapato', 'tenis', 'reloj', 'bolso', 'cartera', 'joyeria'],
            'Deportes' => ['bicicleta', 'bici', 'gym', 'pesas', 'camping', 'futbol', 'basket'],
        ];

        $subcategoryKeywords = [
            'Electrónica' => [
                'Smartphones' => ['iphone', 'samsung', 'celular', 'smartphone', 'galaxy', 'pixel'],
                'Laptops' => ['laptop', 'macbook', 'computadora', 'notebook'],
                'Tablets' => ['tablet', 'ipad', 'tab'],
                'Cámaras' => ['camara', 'camera', 'dslr', 'mirrorless'],
                'Consolas' => ['playstation', 'xbox', 'nintendo', 'switch', 'ps4', 'ps5'],
            ],
            'Autos' => [
                'Autos Compactos' => ['compacto', 'sedan', 'vers'],
                'SUVs' => ['suv', 'crossover', 'kicks', 'crv', 'rav4'],
                'Pickups' => ['pickup', 'camioneta', 'np300', 'hilux'],
            ],
        ];

        $detectedCategory = null;
        $detectedSubcategory = null;
        $keywords = [];

        foreach ($categoryKeywords as $category => $kws) {
            foreach ($kws as $kw) {
                if (str_contains($filename, $kw)) {
                    $detectedCategory = $category;
                    $keywords[] = $kw;
                    break 2;
                }
            }
        }

        if ($detectedCategory && isset($subcategoryKeywords[$detectedCategory])) {
            foreach ($subcategoryKeywords[$detectedCategory] as $subcat => $kws) {
                foreach ($kws as $kw) {
                    if (str_contains($filename, $kw)) {
                        $detectedSubcategory = $subcat;
                        break 2;
                    }
                }
            }
        }

        return [
            'category' => $detectedCategory ?? 'Otros',
            'subcategory' => $detectedSubcategory,
            'confidence' => $detectedCategory ? 'medium' : 'low',
            'keywords' => array_unique($keywords),
        ];
    }

    /**
     * Get image metadata
     */
    private function getImageMetadata(string $imagePath): array
    {
        $metadata = [
            'filename' => basename($imagePath),
            'size' => 0,
            'dimensions' => null,
            'format' => null,
        ];

        try {
            if (Storage::exists($imagePath)) {
                $metadata['size'] = Storage::size($imagePath);
                
                // Try to get dimensions
                $fullPath = Storage::path($imagePath);
                if (file_exists($fullPath)) {
                    $imageSize = @getimagesize($fullPath);
                    if ($imageSize) {
                        $metadata['dimensions'] = [
                            'width' => $imageSize[0],
                            'height' => $imageSize[1],
                        ];
                        $metadata['format'] = image_type_to_extension($imageSize[2], false);
                    }
                }
            }
        } catch (\Exception $e) {
            // Ignore errors
        }

        return $metadata;
    }

    /**
     * Batch analyze multiple images
     */
    public function analyzeBatch(array $imagePaths, ?string $title = null): array
    {
        $results = [];
        
        foreach ($imagePaths as $path) {
            $results[] = $this->analyze($path, $title);
        }

        // Aggregate results
        $categories = array_column($results, 'suggested_category');
        $categoryCounts = array_count_values($categories);
        arsort($categoryCounts);
        
        $topCategory = array_key_first($categoryCounts);
        $confidence = count($categories) > 0 
            ? ($categoryCounts[$topCategory] / count($categories)) 
            : 0;

        return [
            'success' => true,
            'suggested_category' => $topCategory,
            'confidence_score' => round($confidence, 2),
            'category_votes' => $categoryCounts,
            'individual_results' => $results,
        ];
    }
}
