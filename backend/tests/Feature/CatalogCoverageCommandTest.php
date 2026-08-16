<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CatalogCoverageCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_editorial_catalog_coverage_is_idempotent_transparent_and_complete(): void
    {
        Storage::fake('public');

        $this->artisan('ads:ensure-catalog-coverage', ['--minimum' => 2])->assertSuccessful();
        $this->artisan('ads:audit-catalog-coverage', ['--minimum' => 2])->assertSuccessful();

        $categories = \App\Models\Category::query()->pluck('slug');
        foreach ($categories as $slug) {
            $this->assertGreaterThanOrEqual(2, Ad::query()->where('category', $slug)->where('status', 'active')->count(), $slug);
        }

        $fillers = Ad::query()->where('is_catalog_filler', true)->get();
        $this->assertNotEmpty($fillers);
        $images = [];
        foreach ($fillers as $ad) {
            $this->assertSame('approved', $ad->ai_moderation_status);
            $this->assertSame('active', $ad->status);
            $this->assertNull($ad->expires_at);
            $this->assertGreaterThan(60, mb_strlen(strip_tags((string) $ad->description)));
            $first = json_decode((string) $ad->getRawOriginal('image_url'), true)[0] ?? null;
            $this->assertNotNull($first);
            $this->assertTrue(Storage::disk('public')->exists($first));
            $images[] = $first;
        }
        $this->assertCount(count(array_unique($images)), $images, 'catalog images must not repeat');

        $owner = User::query()->where('email', 'catalogo@mercasto.local')->firstOrFail();
        $this->assertNull($owner->whatsapp);
        $this->assertNull($owner->phone_number);

        $before = Ad::query()->where('is_catalog_filler', true)->count();
        $this->artisan('ads:ensure-catalog-coverage', ['--minimum' => 2])->assertSuccessful();
        $this->assertSame($before, Ad::query()->where('is_catalog_filler', true)->count());
    }
}
