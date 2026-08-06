<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CategoryFilterCompatibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        $this->seedDatabaseAttribute('motor', 'year', 'number');
        $this->seedDatabaseAttribute('motor', 'km', 'number');
        $this->seedDatabaseAttribute('motor', 'marca', 'select');
        $this->seedDatabaseAttribute('inmobiliaria', 'area', 'number');
        $this->seedDatabaseAttribute('inmobiliaria', 'rooms', 'number');
        $this->seedDatabaseAttribute('inmobiliaria', 'bathrooms', 'number');
        $this->seedDatabaseAttribute('empleo', 'salary', 'number');
    }

    public function test_motor_filters_match_canonical_and_legacy_storage_keys(): void
    {
        $legacy = $this->createAd('motor', [
            'brand' => 'Toyota',
            'year' => 2024,
            'kms' => 30000,
        ]);
        $canonical = $this->createAd('motor', [
            'marca' => 'Toyota',
            'año' => 2024,
            'kilometraje' => 20000,
        ]);
        $this->createAd('motor', [
            'brand' => 'Ford',
            'year' => 2020,
            'kms' => 90000,
        ]);

        $this->assertFilteredIds('/api/ads?category=motor&filters[year][min]=2024&filters[year][max]=2024', [$legacy, $canonical]);
        $this->assertFilteredIds('/api/ads?category=motor&filters[kilometraje][min]=10000&filters[kilometraje][max]=50000', [$legacy, $canonical]);
        $this->assertFilteredIds('/api/ads?category=motor&filters[km][min]=10000&filters[km][max]=50000', [$legacy, $canonical]);
        $this->assertFilteredIds('/api/ads?category=motor&filters[kms][min]=10000&filters[kms][max]=50000', [$legacy, $canonical]);
        $this->assertFilteredIds('/api/ads?category=motor&filters[marca]=Toyota', [$legacy, $canonical]);
    }

    public function test_real_estate_filters_match_canonical_and_legacy_storage_keys(): void
    {
        $legacy = $this->createAd('inmobiliaria', [
            'area' => 120,
            'rooms' => 3,
            'bathrooms' => 2,
        ]);
        $canonical = $this->createAd('inmobiliaria', [
            'metros_cuadrados' => 90,
            'habitaciones' => 2,
            'baños' => 1,
        ]);
        $this->createAd('inmobiliaria', [
            'area' => 400,
            'rooms' => 6,
            'bathrooms' => 5,
        ]);

        $this->assertFilteredIds('/api/ads?category=inmobiliaria&filters[metros_cuadrados][min]=80&filters[metros_cuadrados][max]=130', [$legacy, $canonical]);
        $this->assertFilteredIds('/api/ads?category=inmobiliaria&filters[habitaciones][min]=2&filters[habitaciones][max]=3', [$legacy, $canonical]);
        $this->assertFilteredIds('/api/ads?category=inmobiliaria&filters[banos][min]=1&filters[banos][max]=2', [$legacy, $canonical]);
    }

    public function test_employment_salary_filter_matches_canonical_and_legacy_storage_keys(): void
    {
        $legacy = $this->createAd('empleo', ['salary' => 30000]);
        $canonical = $this->createAd('empleo', ['salario' => 25000]);
        $this->createAd('empleo', ['salary' => 80000]);

        $this->assertFilteredIds('/api/ads?category=empleo&filters[salario][min]=20000&filters[salario][max]=35000', [$legacy, $canonical]);
        $this->assertFilteredIds('/api/ads?category=empleo&filters[salary][min]=20000&filters[salary][max]=35000', [$legacy, $canonical]);
    }

    public function test_database_number_attribute_uses_range_semantics(): void
    {
        DB::table('categories')->insert([
            'slug' => 'custom-range',
            'name' => json_encode(['es' => 'Rango']),
            'icon' => 'Sliders',
            'sort_order' => 99,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->seedDatabaseAttribute('custom-range', 'weight', 'number');

        $inside = $this->createAd('custom-range', ['weight' => 25]);
        $this->createAd('custom-range', ['weight' => 75]);

        $this->assertFilteredIds('/api/ads?category=custom-range&filters[weight][min]=20&filters[weight][max]=30', [$inside]);
    }

    private function createAd(string $category, array $attributes): Ad
    {
        $user = User::factory()->create();

        return Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Filter fixture ' . uniqid('', true),
            'description' => 'Structured filter compatibility fixture.',
            'price' => 1000,
            'location' => 'Ciudad de México',
            'category' => $category,
            'status' => 'active',
            'attributes' => $attributes,
        ]);
    }

    private function assertFilteredIds(string $url, array $expectedAds): void
    {
        $response = $this->getJson($url);
        $response->assertOk();

        $expectedIds = collect($expectedAds)->pluck('id')->all();
        $actualIds = collect($response->json('data'))->pluck('id')->all();

        $this->assertEqualsCanonicalizing($expectedIds, $actualIds, $url);
    }

    private function seedDatabaseAttribute(string $categorySlug, string $key, string $type): void
    {
        $categoryId = DB::table('categories')->where('slug', $categorySlug)->value('id');
        $this->assertNotNull($categoryId, "Missing seeded category {$categorySlug}");

        DB::table('category_attributes')->updateOrInsert(
            ['category_id' => $categoryId, 'key' => $key],
            [
                'label' => json_encode(['es' => $key]),
                'type' => $type,
                'options' => null,
                'required' => false,
                'sort_order' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }
}
