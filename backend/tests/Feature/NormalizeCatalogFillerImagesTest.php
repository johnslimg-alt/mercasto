<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use ReflectionClass;
use Tests\TestCase;

class NormalizeCatalogFillerImagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_semantic_remap_is_dry_run_by_default_and_only_updates_catalog_fillers(): void
    {
        Storage::fake('public');
        $this->seedSemanticPoolFiles();
        Storage::disk('public')->put('ads/catalog/photos/recovered-seed.jpg', 'seed');
        Storage::disk('public')->put('ads/catalog/photos/recovered-genuine.jpg', 'genuine');

        $user = User::factory()->create();
        $cases = [
            ['motor', 'Honda Civic 2020 impecable', 'car'],
            ['motor', 'Moto BMW G310 GS Adventure', 'motorcycle'],
            ['servicios', 'Plomería 24/7 urgencias', 'plumbing'],
            ['moda', 'Camisa de Vestir Slim Fit', 'fashion'],
            ['mascotas', 'Rascador moderno para gato', 'pet_cat'],
            ['mascotas', 'Acuario 100L con filtro', 'pet_aquarium'],
            ['mascotas', 'Bebedero de fuente con filtro', 'pet_general'],
            ['inmobiliaria', 'Terreno Comercial 500m2', 'land'],
            ['negocios', 'Refrigerador comercial vitrina', 'equipment'],
            ['electronica', 'Google Pixel 8 Pro', 'electronics_mobile'],
            ['electronica', 'iPad Pro M1 11 pulgadas', 'electronics_tablet'],
            ['electronica', 'Apple Watch Series 8 GPS', 'electronics_wearable'],
            ['electronica', 'Tarjeta Gráfica RTX 3060', 'electronics_component'],
            ['electronica', 'Dell XPS 13 Ultra', 'electronics_computer'],
            ['electronica', 'Drone DJI Avata FPV', 'electronics_drone'],
            ['electronica', 'Audífonos Sony WH-1000XM5', 'electronics_audio'],
            ['electronica', 'Pantalla LG OLED 65 pulgadas 4K', 'electronics_tv'],
            ['empleo', 'Ingeniero Backend PHP', 'office'],
        ];

        $fillers = [];
        foreach ($cases as [$category, $title, $semanticKey]) {
            $fillers[] = [$this->makeAd($user, true, $category, $title, 'ads/catalog/photos/recovered-seed.jpg'), $semanticKey];
        }
        $genuine = $this->makeAd($user, false, 'motor', 'Honda Civic real del usuario', 'ads/catalog/photos/recovered-genuine.jpg');

        $this->assertSame(0, Artisan::call('ads:normalize-catalog-filler-images'));
        foreach ($fillers as [$ad]) {
            $this->assertSame('ads/catalog/photos/recovered-seed.jpg', $this->firstImage($ad->fresh()));
        }
        $this->assertSame('ads/catalog/photos/recovered-genuine.jpg', $this->firstImage($genuine->fresh()));

        $this->assertSame(0, Artisan::call('ads:normalize-catalog-filler-images', ['--apply' => true]));

        $pools = (new ReflectionClass(\App\Console\Commands\NormalizeCatalogFillerImages::class))->getConstant('POOLS');
        foreach ($fillers as [$ad, $semanticKey]) {
            $fresh = $ad->fresh();
            $this->assertTrue($fresh->is_catalog_filler);
            $this->assertFalse($fresh->generated_cover);
            $this->assertSame($semanticKey, $fresh->attributes['catalog_image_semantic_key'] ?? null);
            $this->assertSame('curated-local', $fresh->attributes['catalog_image_source'] ?? null);
            $this->assertContains($this->firstImage($fresh), $pools[$semanticKey]);
        }
        $this->assertSame('ads/catalog/photos/recovered-genuine.jpg', $this->firstImage($genuine->fresh()));
        $this->assertArrayNotHasKey('catalog_image_semantic_key', $genuine->fresh()->attributes ?? []);

        $imagesAfterApply = array_map(fn (array $row) => $this->firstImage($row[0]->fresh()), $fillers);
        $this->assertSame(0, Artisan::call('ads:normalize-catalog-filler-images'));
        $this->assertStringContainsString('changes=0', Artisan::output());
        $this->assertSame($imagesAfterApply, array_map(fn (array $row) => $this->firstImage($row[0]->fresh()), $fillers));
    }

    public function test_semantic_remap_refuses_non_recovered_active_filler(): void
    {
        Storage::fake('public');
        $this->seedSemanticPoolFiles();
        Storage::disk('public')->put('ads/catalog/manual.jpg', 'manual');
        $user = User::factory()->create();
        $ad = $this->makeAd($user, true, 'motor', 'Honda Civic 2020', 'ads/catalog/manual.jpg');

        $this->assertSame(1, Artisan::call('ads:normalize-catalog-filler-images'));
        $this->assertSame('ads/catalog/manual.jpg', $this->firstImage($ad->fresh()));
    }

    private function seedSemanticPoolFiles(): void
    {
        $pools = (new ReflectionClass(\App\Console\Commands\NormalizeCatalogFillerImages::class))->getConstant('POOLS');
        foreach (array_unique(array_merge(...array_values($pools))) as $path) {
            Storage::disk('public')->put($path, 'image');
        }
    }

    private function makeAd(User $user, bool $filler, string $category, string $title, string $image): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => $title,
            'description' => 'Publicación de prueba con descripción suficientemente completa para validar el remapeo semántico de imágenes.',
            'price' => 2500,
            'location' => 'Veracruz, Veracruz',
            'category' => $category,
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => json_encode([$image]),
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'generated_cover' => false,
            'ai_moderation_status' => 'approved',
        ]);
    }

    private function firstImage(Ad $ad): string
    {
        $images = json_decode((string) $ad->getRawOriginal('image_url'), true);
        return is_array($images) ? (string) ($images[0] ?? '') : '';
    }
}
