<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class NormalizeCatalogFillerImages extends Command
{
    protected $signature = 'ads:normalize-catalog-filler-images {--apply : Apply the semantic image remap; without this flag the command is read-only}';
    protected $description = 'Assign local catalog filler photos by listing semantics without touching genuine user listings.';

    private const RECOVERED_PREFIX = 'ads/catalog/photos/recovered-';
    private const CURATED_PREFIX = 'ads/catalog/photos/curated-';

    private const POOLS = [
        'car' => [
            'ads/catalog/photos/recovered-0c5e529ea7aecc90df3592f9.jpg',
            'ads/catalog/photos/recovered-167c9191d1d3fb88de26b3f7.jpg',
            'ads/catalog/photos/recovered-1e605173ceefe273cf5fb623.jpg',
            'ads/catalog/photos/recovered-20b57014cf9b3b4b6bff1d5e.jpg',
            'ads/catalog/photos/recovered-58b727098b297bb85efd6bb0.jpg',
            'ads/catalog/photos/recovered-aa892041cac7d641c3163b0f.jpg',
            'ads/catalog/photos/recovered-c856c36a07bb7efa23ea7b6f.jpg',
        ],
        'car_accessory' => ['ads/catalog/photos/curated-car-seat-pexels-31306012.jpg'],
        'motorcycle' => [
            'ads/catalog/photos/recovered-2ad62fabd46a04e4b7fa0b97.jpg',
            'ads/catalog/photos/recovered-3a31b29ad2b93183d0d43f9e.jpg',
        ],
        'bicycle' => [
            'ads/catalog/photos/recovered-9f6098992c0d0a01baaccbca.jpg',
            'ads/catalog/photos/recovered-bf33365179c39ba36c299b1a.jpg',
        ],
        'camping' => [
            'ads/catalog/photos/recovered-16adf52522d7c1ba681e9361.jpg',
            'ads/catalog/photos/recovered-1e04c4e7bda75d940a989985.jpg',
        ],
        'yoga' => ['ads/catalog/photos/recovered-18c6e66a25ed1f081e20bb8a.jpg'],
        'water' => [
            'ads/catalog/photos/recovered-3e206705763ff727b042859b.jpg',
            'ads/catalog/photos/recovered-4504ed6aadb25fabfd412945.jpg',
        ],
        'travel' => [
            'ads/catalog/photos/recovered-2f649a90ae84889b4c24a6f2.jpg',
            'ads/catalog/photos/recovered-6cf00fd06d52d7bc8a5cc3f7.jpg',
            'ads/catalog/photos/recovered-cae80da0707eca77f2663674.jpg',
        ],
        'houses' => [
            'ads/catalog/photos/recovered-05c49ed1f379c7a4a53664f0.jpg',
            'ads/catalog/photos/recovered-40156730d4b578610dcaca48.jpg',
            'ads/catalog/photos/recovered-473a1203217f61038f559dff.jpg',
            'ads/catalog/photos/recovered-9991b0792fdc1d18ec642faa.jpg',
            'ads/catalog/photos/recovered-99b4b8fd399e87831076ecea.jpg',
        ],
        'interiors' => [
            'ads/catalog/photos/recovered-115dd0a8d885487fec44deb5.jpg',
            'ads/catalog/photos/recovered-2d8eb849fb47cde672d63932.jpg',
            'ads/catalog/photos/recovered-d45aa31b021163587e56338d.jpg',
            'ads/catalog/photos/recovered-fb54e9a6632a7b7fd17f27f1.jpg',
        ],
        'office' => [
            'ads/catalog/photos/recovered-585a53651812d223a4a7d467.jpg',
            'ads/catalog/photos/recovered-a23eeeb4c6855bc0405ba291.jpg',
            'ads/catalog/photos/recovered-d770b1d2cd75e43ccd90aea6.jpg',
            'ads/catalog/photos/recovered-e4e1054f8695c359d3c29950.jpg',
            'ads/catalog/photos/recovered-f1240d6c2c956f185b6b486c.jpg',
            'ads/catalog/photos/recovered-fbca2b2bac34642ca4be2c1a.jpg',
        ],
        'electronics' => [
            'ads/catalog/photos/recovered-12d10509270a4429f57a6d43.jpg',
            'ads/catalog/photos/recovered-f4acebeb76b4aa4407cdd511.jpg',
        ],
        'electronics_computer' => [
            'ads/catalog/photos/recovered-12d10509270a4429f57a6d43.jpg',
            'ads/catalog/photos/recovered-deb5000b89dc7274f1189c59.jpg',
            'ads/catalog/photos/recovered-f4acebeb76b4aa4407cdd511.jpg',
            'ads/catalog/photos/recovered-fbca2b2bac34642ca4be2c1a.jpg',
        ],
        'electronics_mobile' => ['ads/catalog/photos/curated-smartphone-pexels-11120521.jpg'],
        'electronics_tablet' => ['ads/catalog/photos/curated-tablet-pexels-9052250.jpg'],
        'electronics_wearable' => ['ads/catalog/photos/curated-smartwatch-pexels-15228779.jpg'],
        'electronics_component' => ['ads/catalog/photos/curated-components-pexels-37113174.jpg'],
        'electronics_drone' => ['ads/catalog/photos/curated-drone-pexels-7582198.jpg'],
        'electronics_tv' => ['ads/catalog/photos/curated-tv-pexels-6527053.jpg'],
        'electronics_audio' => ['ads/catalog/photos/curated-audio-pexels-3394648.jpg'],
        'cleaning' => ['ads/catalog/photos/recovered-2b406670f8efed81f5396c61.jpg'],
        'repair' => [
            'ads/catalog/photos/recovered-633d60dd32902032533a651c.jpg',
            'ads/catalog/photos/recovered-c666dbda1638d20c7a4e9ee9.jpg',
        ],
        'plumbing' => ['ads/catalog/photos/recovered-ce255c0fcc8600c912d51d62.jpg'],
        'fashion' => [
            'ads/catalog/photos/recovered-2510d496d7aa3fe0a25938c0.jpg',
            'ads/catalog/photos/recovered-cefb3ccd89cf8809327a208f.jpg',
            'ads/catalog/photos/recovered-fbafab4713bd5cd06c64bf9b.jpg',
        ],
        'pet_dog' => [
            'ads/catalog/photos/recovered-06c5223204dc61cebeba2a8e.jpg',
            'ads/catalog/photos/recovered-eec4f9bc06881f96035a4f9e.jpg',
        ],
        'pet_cat' => ['ads/catalog/photos/recovered-9a28fd5d0ae947122abab45b.jpg'],
        'pet_general' => [
            'ads/catalog/photos/recovered-06c5223204dc61cebeba2a8e.jpg',
            'ads/catalog/photos/recovered-9a28fd5d0ae947122abab45b.jpg',
            'ads/catalog/photos/recovered-eec4f9bc06881f96035a4f9e.jpg',
        ],
        'pet_aquarium' => ['ads/catalog/photos/curated-aquarium-pexels-18420707.jpg'],
        'land' => ['ads/catalog/photos/curated-land-pexels-37738120.jpg'],
        'warehouse' => ['ads/catalog/photos/curated-warehouse-pexels-4481326.jpg'],
        'education' => [
            'ads/catalog/photos/recovered-9a8bc0e3cd2b00e7bd8b4e0a.jpg',
            'ads/catalog/photos/recovered-deb5000b89dc7274f1189c59.jpg',
            'ads/catalog/photos/recovered-e4e1054f8695c359d3c29950.jpg',
            'ads/catalog/photos/recovered-fbca2b2bac34642ca4be2c1a.jpg',
        ],
        'sports' => [
            'ads/catalog/photos/recovered-18c6e66a25ed1f081e20bb8a.jpg',
            'ads/catalog/photos/recovered-26f29a0075f9a39c72029ae8.jpg',
            'ads/catalog/photos/recovered-4504ed6aadb25fabfd412945.jpg',
            'ads/catalog/photos/recovered-9f6098992c0d0a01baaccbca.jpg',
            'ads/catalog/photos/recovered-bf33365179c39ba36c299b1a.jpg',
        ],
        'concert' => [
            'ads/catalog/photos/recovered-7e089abbbb443e9d668e71e7.jpg',
            'ads/catalog/photos/recovered-f7e57debaca0ca294529bca0.jpg',
        ],
        'kids' => [
            'ads/catalog/photos/recovered-9a8bc0e3cd2b00e7bd8b4e0a.jpg',
            'ads/catalog/photos/recovered-f5a7ac3089a912691904b427.jpg',
        ],
        'equipment' => [
            'ads/catalog/photos/recovered-633d60dd32902032533a651c.jpg',
            'ads/catalog/photos/recovered-a897de92c84026f54ea1bb8d.jpg',
        ],
        'night' => ['ads/catalog/photos/recovered-2f649a90ae84889b4c24a6f2.jpg'],
    ];

    public function handle(): int
    {
        try {
            $plan = $this->buildPlan();
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        $counts = [];
        $changed = 0;
        foreach ($plan as $row) {
            $counts[$row['key']] = ($counts[$row['key']] ?? 0) + 1;
            if ($row['current'] !== $row['target']) $changed++;
        }
        ksort($counts);
        $this->table(['semantic key', 'listings'], array_map(fn ($key, $count) => [$key, $count], array_keys($counts), array_values($counts)));
        $this->info('CATALOG_IMAGE_SEMANTIC_PLAN total=' . count($plan) . ' changes=' . $changed);

        if (! $this->option('apply')) {
            $this->comment('Dry run only. No database rows changed. Pass --apply after reviewing the plan.');
            return self::SUCCESS;
        }

        try {
            DB::transaction(function () use ($plan): void {
                $ads = Ad::query()->whereIn('id', array_keys($plan))->lockForUpdate()->get()->keyBy('id');
                if ($ads->count() !== count($plan)) throw new RuntimeException('Catalog row set changed before apply.');
                foreach ($plan as $id => $row) {
                    /** @var Ad|null $ad */
                    $ad = $ads->get($id);
                    if (! $ad || ! $ad->is_catalog_filler || $ad->status !== 'active') {
                        throw new RuntimeException("Ad {$id} is no longer an active catalog filler.");
                    }
                    $current = $this->firstImage($ad);
                    if ($current !== $row['current']) {
                        throw new RuntimeException("Ad {$id} image changed after dry-run planning; refusing apply.");
                    }
                    $attributes = is_array($ad->attributes) ? $ad->attributes : [];
                    $attributes['catalog_image_semantic_key'] = $row['key'];
                    $attributes['catalog_image_source'] = 'curated-local';
                    $ad->timestamps = false;
                    $ad->forceFill([
                        'image_url' => json_encode([$row['target']], JSON_UNESCAPED_SLASHES),
                        'generated_cover' => false,
                        'attributes' => $attributes,
                    ])->saveQuietly();
                }
            });
            $this->verify($plan);
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());
            return self::FAILURE;
        }

        $this->info('CATALOG_IMAGE_SEMANTIC_REMAP=PASS updated=' . $changed . ' total=' . count($plan));
        return self::SUCCESS;
    }

    /** @return array<int,array{current:string,target:string,key:string}> */
    private function buildPlan(): array
    {
        $ads = Ad::query()->where('status', 'active')->where('is_catalog_filler', true)->orderBy('id')->get();
        if ($ads->isEmpty()) throw new RuntimeException('No active catalog fillers found.');
        $plan = [];
        foreach ($ads as $ad) {
            $current = $this->firstImage($ad);
            if (! $this->isManagedSource($current) || ! Storage::disk('public')->exists($current)) {
                throw new RuntimeException("Ad {$ad->id} does not have a verified recovered local photo: {$current}");
            }
            $key = $this->semanticKey($ad);
            $target = $this->pick($key, (int) $ad->id);
            if (! Storage::disk('public')->exists($target)) {
                throw new RuntimeException("Semantic target is missing for ad {$ad->id}: {$target}");
            }
            $plan[(int) $ad->id] = ['current' => $current, 'target' => $target, 'key' => $key];
        }
        return $plan;
    }

    private function firstImage(Ad $ad): string
    {
        $images = json_decode((string) $ad->getRawOriginal('image_url'), true);
        return is_array($images) ? (string) ($images[0] ?? '') : '';
    }

    private function semanticKey(Ad $ad): string
    {
        $text = Str::lower(Str::ascii(implode(' ', array_filter([(string) $ad->title, (string) $ad->subcategory, (string) $ad->description]))));
        $has = fn (array $needles): bool => collect($needles)->contains(fn ($needle) => str_contains($text, $needle));
        return match ((string) $ad->category) {
            'motor' => $has(['funda', 'asiento', 'cubreasiento', 'cubre asiento', 'cubrevolante', 'tapete']) ? 'car_accessory' : ($has(['moto', 'scooter', 'cuatrimoto']) ? 'motorcycle' : ($has(['bici']) ? 'bicycle' : 'car')),
            'electronica' => $this->electronicsKey($has),
            'empleo' => $has(['limpieza']) ? 'cleaning' : ($has(['plomer']) ? 'plumbing' : ($has(['electric', 'repar', 'mantenimiento', 'constru']) ? 'repair' : ($has(['chofer', 'repartidor', 'conductor']) ? 'car' : 'office'))),
            'servicios' => $has(['plomer']) ? 'plumbing' : ($has(['limpi']) ? 'cleaning' : 'repair'),
            'inmobiliaria' => $has(['bodega', 'almacen', 'nave industrial', 'logistica']) ? 'warehouse' : ($has(['terreno']) ? 'land' : ($has(['departamento', 'interior']) ? 'interiors' : ($has(['local', 'oficina', 'comercial']) ? 'office' : 'houses'))),
            'hogar' => $has(['herramienta', 'taladro']) ? 'repair' : 'interiors',
            'moda' => 'fashion',
            'ocio' => $has(['bici']) ? 'bicycle' : ($has(['yoga']) ? 'yoga' : ($has(['surf', 'kayak']) ? 'water' : ($has(['camping', 'campana']) ? 'camping' : ($has(['consola', 'videojuego']) ? 'electronics' : ($has(['libro']) ? 'education' : ($has(['guitarra', 'musica']) ? 'concert' : 'sports')))))),
            'mascotas' => $has(['acuario']) ? 'pet_aquarium' : ($has(['gato', 'arena', 'rascador', 'tunel', 'laser']) ? 'pet_cat' : ($has(['perro', 'raza mediana', 'arnes', 'cuerda', 'cama']) ? 'pet_dog' : 'pet_general')),
            'turismo' => $has(['auto', 'sedan', 'camioneta', 'suv']) ? 'car' : ($has(['moto', 'scooter']) ? 'motorcycle' : ($has(['bici']) ? 'bicycle' : ($has(['yate', 'acuatica', 'waverunner']) ? 'water' : 'travel'))),
            'infantil' => 'kids',
            'boletos' => $has(['formula 1']) ? 'car' : ($has(['boxeo', 'pumas', 'futbol', 'estadio']) ? 'sports' : 'concert'),
            'negocios' => $has(['maquinaria', 'cortadora', 'industrial', 'equipo', 'refrigerador', 'carretilla', 'proyector']) ? 'equipment' : 'office',
            'formacion' => $has(['yoga']) ? 'yoga' : ($has(['crossfit', 'deport']) ? 'sports' : ($has(['astronom']) ? 'night' : 'education')),
            'hospedaje' => 'houses',
            'retiros_bienestar' => 'yoga',
            'articulos_camping' => 'camping',
            'renta_vehiculos' => $has(['yate']) ? 'water' : 'car',
            'boletos_turismo', 'atracciones_exp', 'tours', 'guias_servicios' => 'travel',
            'souvenirs' => 'fashion',
            default => 'office',
        };
    }


    private function isManagedSource(string $path): bool
    {
        return str_starts_with($path, self::RECOVERED_PREFIX) || str_starts_with($path, self::CURATED_PREFIX);
    }

    private function electronicsKey(callable $has): string
    {
        if ($has(['drone', 'dji', 'autel'])) return 'electronics_drone';
        if ($has(['audifon', 'headset', 'bocina', 'soundbar', 'microfono', 'sony wh', 'jbl', 'bose'])) return 'electronics_audio';
        if ($has(['smart tv', 'oled', 'qled', 'television', 'pantalla', 'proyector'])) return 'electronics_tv';
        if ($has(['ipad', 'tablet', 'galaxy tab', 'lenovo tab'])) return 'electronics_tablet';
        if ($has(['watch', 'garmin', 'smartband', 'fenix', 'forerunner'])) return 'electronics_wearable';
        if ($has(['ram ', ' ram', 'ryzen', 'rtx', 'tarjeta grafica', 'procesador', 'motherboard', 'componente'])) return 'electronics_component';
        if ($has(['laptop', 'macbook', 'thinkpad', 'xps', 'zephyrus', 'teclado', 'mouse', 'monitor', 'webcam', 'soporte monitor'])) return 'electronics_computer';
        if ($has(['iphone', 'galaxy s', 'pixel', 'xiaomi', 'redmi', 'motorola', 'smartphone', 'funda', 'mica', 'magsafe', 'spigen', 'otterbox', 'carcasa', 'powerbank', 'cargador', 'cable'])) return 'electronics_mobile';
        return 'electronics';
    }

    private function pick(string $key, int $id): string
    {
        $pool = self::POOLS[$key] ?? null;
        if (! is_array($pool) || $pool === []) throw new RuntimeException("Missing semantic image pool: {$key}");
        $index = abs(crc32($key . ':' . $id)) % count($pool);
        return $pool[$index];
    }

    private function verify(array $plan): void
    {
        $ads = Ad::query()->whereIn('id', array_keys($plan))->get()->keyBy('id');
        foreach ($plan as $id => $row) {
            /** @var Ad|null $ad */
            $ad = $ads->get($id);
            if (! $ad || ! $ad->is_catalog_filler || $ad->status !== 'active' || $this->firstImage($ad) !== $row['target']) {
                throw new RuntimeException("Post-remap verification failed for ad {$id}.");
            }
        }
    }
}
