<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Services\AdIllustrativeCoverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ModerationPlaceholderReplacementTest extends TestCase
{
    use RefreshDatabase;

    public function test_real_photo_replaces_generated_cover(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('ads/placeholders/old.svg', '<svg/>');
        Storage::disk('public')->put('ads/real.webp', 'real');

        $ad = new Ad([
            'title' => 'Producto',
            'description' => 'Descripción',
            'category' => 'general',
            'image_url' => json_encode(['ads/placeholders/old.svg', 'ads/real.webp']),
            'generated_cover' => true,
        ]);
        $ad->id = 999;
        $ad->exists = true;

        app(AdIllustrativeCoverService::class)->ensureCover($ad);

        $this->assertSame(['ads/real.webp'], json_decode($ad->image_url, true));
        $this->assertFalse((bool) $ad->generated_cover);
        Storage::disk('public')->assertMissing('ads/placeholders/old.svg');
    }
}
