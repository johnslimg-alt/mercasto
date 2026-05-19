<?php

namespace App\Console\Commands;

use App\Services\DeepSeekClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use RuntimeException;

class DeepSeekCategoryAudit extends Command
{
    protected $signature = 'deepseek:category-audit {--model=flash} {--out=storage/app/ai-audits/category-attributes-audit.json}';

    protected $description = 'Internal DeepSeek audit for Mercasto category attributes and filters.';

    public function handle(DeepSeekClient $client): int
    {
        $model = (string) $this->option('model');
        $out = (string) $this->option('out');

        $categories = [
            'Coches' => ['Compactos','SUV','Pickup','Sedán','Hatchback','Coupé','Deportivos','Clásicos','Eléctricos','Accesorios'],
            'Motor' => ['Motos','Scooters','Cuatrimotos','UTV','Motos de agua','Refacciones','Cascos','Equipamiento'],
            'Inmobiliaria' => ['Casas en venta','Casas en renta','Departamentos','Terrenos','Locales comerciales','Oficinas','Bodegas','Renta vacacional'],
            'Empleo' => ['Ventas','Chofer','Construcción','Administración','Atención al cliente','Tecnología','Hotelería','Medio tiempo'],
            'Servicios' => ['Mudanzas','Limpieza','Plomería','Electricidad','Cerrajería','Clases','Diseño','Eventos'],
            'Electrónica' => ['Laptops','Tablets','TV y video','Audio','Cámaras','Drones','Accesorios'],
            'Móviles y Telefonía' => ['iPhone','Android','Smartwatch','Accesorios','Tablets','Repuestos'],
            'Negocios' => ['Traspasos','Franquicias','Equipamiento','Maquinaria','Industria','Inversión'],
        ];

        $messages = [
            [
                'role' => 'system',
                'content' => 'Eres CTO de Mercasto.com, marketplace de anuncios para México. Debes responder ÚNICAMENTE un objeto JSON válido, sin markdown, sin texto antes/después, sin comentarios. El JSON debe tener exactamente estas claves de primer nivel: priority_verticals, attribute_schema, search_filters, publish_form_sections, implementation_steps, acceptance_criteria, risks. Si no sabes algo, usa arrays vacíos. No secretos. No auth. No pagos. Diseña atributos y filtros incrementales sobre attributes JSON y filters[key].',
            ],
            [
                'role' => 'user',
                'content' => json_encode([
                    'task' => 'Generate Mercasto category attribute schema and rollout plan',
                    'categories' => $categories,
                    'output_shape' => [
                        'priority_verticals' => ['string'],
                        'recommended_next_step' => 'string',
                        'implementation_steps' => ['string'],
                        'acceptance_criteria' => ['string'],
                        'risks' => ['string'],
                    ],
                    'constraints' => [
                        'max_items_per_array' => 8,
                        'keep_response_compact' => true,
                    ],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ],
        ];

        $options = [
            'max_tokens' => 6000,
            'temperature' => 0,
            'timeout' => 120,
            'thinking' => 'disabled',
            'response_format' => ['type' => 'json_object'],
        ];

        $response = $model === 'pro'
            ? $client->chatPro($messages, $options)
            : $client->chatFlash($messages, $options);

        $content = $response['choices'][0]['message']['content'] ?? '';

        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('DeepSeek returned empty content.');
        }

        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
            File::ensureDirectoryExists(base_path('storage/app/ai-audits'));
            file_put_contents(base_path('storage/app/ai-audits/category-attributes-audit.raw.txt'), $content);
            throw new RuntimeException('DeepSeek returned non-JSON content. Raw response saved to storage/app/ai-audits/category-attributes-audit.raw.txt');
        }

        File::ensureDirectoryExists(dirname(base_path($out)));

        file_put_contents(
            base_path($out),
            json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL
        );

        $this->info('written=' . $out);
        $this->line(json_encode([
            'ok' => true,
            'model' => $model,
            'priority_verticals' => $decoded['priority_verticals'] ?? [],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return self::SUCCESS;
    }
}
