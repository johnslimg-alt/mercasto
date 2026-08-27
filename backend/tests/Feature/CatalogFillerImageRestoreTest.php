<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogFillerImageRestoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_restore_is_dry_run_by_default_and_updates_only_expected_fillers_on_apply(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $first = $this->makeAd($user, true);
        $second = $this->makeAd($user, true);
        $genuine = $this->makeAd($user, false, 'ads/genuine.jpg');

        foreach ([$first, $second] as $ad) {
            $path = 'ads/catalog/reference-' . $ad->id . '.svg';
            Storage::disk('public')->put($path, '<svg/>');
            $ad->forceFill(['image_url' => json_encode([$path]), 'generated_cover' => true])->saveQuietly();
        }
        Storage::disk('public')->put('ads/catalog/photos/one.jpg', 'image-one');
        Storage::disk('public')->put('ads/catalog/photos/two.jpg', 'image-two');
        Storage::disk('public')->put('ads/genuine.jpg', 'genuine');

        $mapping = tempnam(sys_get_temp_dir(), 'catalog-image-map-');
        file_put_contents($mapping, $first->id . "\tads/catalog/photos/one.jpg\n" . $second->id . "\tads/catalog/photos/two.jpg\n");

        try {
            $this->assertSame(0, Artisan::call('ads:restore-catalog-filler-images', ['--mapping' => $mapping]));
            $this->assertSame('ads/catalog/reference-' . $first->id . '.svg', $this->firstImage($first->fresh()));

            $this->assertSame(0, Artisan::call('ads:restore-catalog-filler-images', ['--mapping' => $mapping, '--apply' => true]));
            $this->assertSame('ads/catalog/photos/one.jpg', $this->firstImage($first->fresh()));
            $this->assertSame('ads/catalog/photos/two.jpg', $this->firstImage($second->fresh()));
            $this->assertFalse($first->fresh()->generated_cover);
            $this->assertFalse($second->fresh()->generated_cover);
            $this->assertSame('ads/genuine.jpg', $this->firstImage($genuine->fresh()));
        } finally {
            @unlink($mapping);
        }
    }

    public function test_restore_refuses_stale_or_duplicate_mapping(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $ad = $this->makeAd($user, true, 'ads/catalog/already-restored.jpg');
        Storage::disk('public')->put('ads/catalog/already-restored.jpg', 'old');
        Storage::disk('public')->put('ads/catalog/photos/new.jpg', 'new');

        $mapping = tempnam(sys_get_temp_dir(), 'catalog-image-map-');
        file_put_contents($mapping, $ad->id . "\tads/catalog/photos/new.jpg\n" . $ad->id . "\tads/catalog/photos/new.jpg\n");
        try {
            $this->assertSame(1, Artisan::call('ads:restore-catalog-filler-images', ['--mapping' => $mapping, '--apply' => true]));
            $this->assertSame('ads/catalog/already-restored.jpg', $this->firstImage($ad->fresh()));
        } finally {
            @unlink($mapping);
        }
    }

    private function makeAd(User $user, bool $filler, ?string $image = null): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => $filler ? 'Referencia de catálogo' : 'Anuncio real',
            'description' => 'Descripción suficientemente larga para una publicación de prueba segura.',
            'price' => 1000,
            'location' => 'Veracruz, Veracruz',
            'category' => 'hogar',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => json_encode([$image ?: 'ads/catalog/reference-pending.svg']),
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'generated_cover' => $filler,
            'ai_moderation_status' => 'approved',
        ]);
    }

    private function firstImage(Ad $ad): string
    {
        $images = json_decode((string) $ad->getRawOriginal('image_url'), true);
        return (string) ($images[0] ?? '');
    }
}
