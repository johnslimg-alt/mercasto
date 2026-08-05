<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdIllustrativeCoverServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_labeled_cover_when_an_ad_has_no_photo(): void
    {
        Storage::fake('public');

        $ad = new Ad([
            'title' => 'Automóvil usado',
            'description' => 'Sedán en buen estado',
            'category' => 'motor',
        ]);
        $ad->id = 999;
        $ad->exists = true;

        $path = app(AdIllustrativeCoverService::class)->ensureCover($ad);

        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);
        $this->assertStringContainsString('Imagen ilustrativa', Storage::disk('public')->get($path));
    }

    public function test_it_migrates_a_known_legacy_logo_without_treating_it_as_a_seller_photo(): void
    {
        Storage::fake('public');
        $legacyBytes = 'legacy-mercato-logo';
        $legacyPath = 'ads/legacy-logo.webp';
        Storage::disk('public')->put($legacyPath, $legacyBytes);
        config([
            'marketplace.legacy_placeholder_sha256' => [hash('sha256', $legacyBytes)],
        ]);

        $ad = new Ad([
            'title' => 'Automóvil usado',
            'description' => 'Sedán en buen estado',
            'category' => 'motor',
            'image_url' => json_encode([$legacyPath]),
            'generated_cover' => false,
        ]);
        $ad->id = 1000;
        $ad->exists = true;

        $service = app(AdIllustrativeCoverService::class);
        $this->assertFalse($service->hasOriginalImages($ad));
        $this->assertSame([], $service->originalImages($ad));

        $newPath = $service->ensureCover($ad);

        $this->assertNotNull($newPath);
        $this->assertStringStartsWith('ads/placeholders/', $newPath);
        $this->assertSame([$newPath], json_decode($ad->image_url, true));
        $this->assertTrue((bool) $ad->generated_cover);
        Storage::disk('public')->assertMissing($legacyPath);
        Storage::disk('public')->assertExists($newPath);
        $this->assertStringContainsString(
            'Imagen ilustrativa',
            Storage::disk('public')->get($newPath)
        );
    }
}
