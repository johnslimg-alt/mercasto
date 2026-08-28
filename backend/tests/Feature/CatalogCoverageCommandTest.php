<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
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
        Category::query()->firstOrCreate(
            ['slug' => 'productos'],
            ['name' => ['es' => 'Productos', 'en' => 'Goods'], 'icon' => 'ShoppingBag', 'sort_order' => 0]
        );

        $this->artisan('ads:ensure-catalog-coverage', ['--minimum' => 2])->assertSuccessful();
        $this->artisan('ads:audit-catalog-coverage', ['--minimum' => 2])->assertSuccessful();

        $categories = Category::query()->pluck('slug');
        foreach ($categories as $slug) {
            if ($slug === 'productos') {
                $this->assertSame(0, Ad::query()->where('category', 'productos')->count(), 'productos is an aggregate landing, not an ad category');
                $this->assertGreaterThanOrEqual(2, Ad::query()
                    ->whereIn('category', ['electronica', 'hogar', 'moda', 'ocio', 'infantil', 'mascotas', 'formacion'])
                    ->where('status', 'active')
                    ->count(), 'productos aggregate coverage');
                continue;
            }
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

    public function test_audit_allows_curated_reuse_only_inside_one_semantic_pool(): void
    {
        Storage::fake('public');
        Category::query()->firstOrCreate(
            ['slug' => 'productos'],
            ['name' => ['es' => 'Productos', 'en' => 'Goods'], 'icon' => 'ShoppingBag', 'sort_order' => 0]
        );
        $this->artisan('ads:ensure-catalog-coverage', ['--minimum' => 2])->assertSuccessful();

        Storage::disk('public')->put('ads/catalog/shared-curated.jpg', 'image');
        $ads = Ad::query()->where('is_catalog_filler', true)->where('status', 'active')->limit(2)->get();
        $this->assertCount(2, $ads);

        foreach ($ads as $ad) {
            $ad->forceFill([
                'image_url' => json_encode(['ads/catalog/shared-curated.jpg']),
                'attributes' => [
                    'catalog_image_source' => 'curated-local',
                    'catalog_image_semantic_key' => 'sports',
                ],
            ])->save();
        }

        $this->artisan('ads:audit-catalog-coverage', ['--minimum' => 2])->assertSuccessful();

        $ads[1]->forceFill([
            'attributes' => [
                'catalog_image_source' => 'curated-local',
                'catalog_image_semantic_key' => 'travel',
            ],
        ])->save();

        $this->artisan('ads:audit-catalog-coverage', ['--minimum' => 2])
            ->expectsOutputToContain('duplicate filler image across incompatible pools')
            ->assertFailed();
    }
}
