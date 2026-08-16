<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogFillerRepairTest extends TestCase
{
    use RefreshDatabase;

    public function test_repair_is_opt_in_and_never_changes_genuine_listings(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $genuine = $this->makeAd($user, false, 'https://example.com/genuine.jpg', 'pending');
        $first = $this->makeAd($user, true, 'https://images.unsplash.com/photo-legacy?sig=1', 'pending');
        $second = $this->makeAd($user, true, 'https://images.unsplash.com/photo-legacy?sig=2', null);
        $second->forceFill([
            'location' => null,
            'city' => 'Boca del Río',
            'state' => 'Veracruz',
        ])->saveQuietly();

        $originalGenuine = $genuine->getRawOriginal('image_url');
        $originalFirst = $first->getRawOriginal('image_url');

        $this->assertSame(0, Artisan::call('ads:repair-catalog-fillers'));
        $this->assertSame($originalFirst, $first->fresh()->getRawOriginal('image_url'));
        $this->assertSame('pending', $first->fresh()->ai_moderation_status);
        $this->assertNull($second->fresh()->location);

        $this->assertSame(0, Artisan::call('ads:repair-catalog-fillers', ['--apply' => true]));

        $first = $first->fresh();
        $second = $second->fresh();
        $genuine = $genuine->fresh();

        $firstImage = json_decode((string) $first->getRawOriginal('image_url'), true)[0] ?? null;
        $secondImage = json_decode((string) $second->getRawOriginal('image_url'), true)[0] ?? null;

        $this->assertSame('approved', $first->ai_moderation_status);
        $this->assertSame('approved', $second->ai_moderation_status);
        $this->assertTrue($first->generated_cover);
        $this->assertTrue($second->generated_cover);
        $this->assertNotSame($firstImage, $secondImage);
        $this->assertSame('ads/catalog/reference-' . $first->id . '.svg', $firstImage);
        $this->assertSame('ads/catalog/reference-' . $second->id . '.svg', $secondImage);
        $this->assertTrue(Storage::disk('public')->exists($firstImage));
        $this->assertTrue(Storage::disk('public')->exists($secondImage));
        $this->assertTrue((bool) ($first->attributes['editorial_reference'] ?? false));
        $this->assertSame('Boca del Río, Veracruz', $second->location);

        $this->assertSame($originalGenuine, $genuine->getRawOriginal('image_url'));
        $this->assertSame('pending', $genuine->ai_moderation_status);
        $this->assertFalse($genuine->generated_cover);
    }

    private function makeAd(User $user, bool $filler, string $image, ?string $moderation): Ad
    {
        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => $filler ? 'Bicicleta urbana de referencia' : 'Bicicleta real del usuario',
            'description' => 'Bicicleta urbana en buen estado con frenos revisados, asiento cómodo y componentes listos para recorridos diarios.',
            'price' => 2500,
            'location' => 'Veracruz, Veracruz',
            'category' => 'ocio',
            'condition' => 'usado',
            'attributes' => [],
            'image_url' => json_encode([$image]),
            'status' => 'active',
            'is_catalog_filler' => $filler,
            'generated_cover' => false,
            'ai_moderation_status' => $moderation,
        ]);
    }
}
