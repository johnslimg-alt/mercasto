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
}
