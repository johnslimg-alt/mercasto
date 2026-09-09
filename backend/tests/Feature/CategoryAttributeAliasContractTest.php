<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\SearchAlert;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CategoryAttributeAliasContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_storage_aliases_are_canonicalized_by_migration_and_write_boundary(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'inmobiliaria')->value('id');
        $this->assertNotNull($categoryId);

        // Keep the fixture self-contained. The migration intentionally derives
        // legacy-label mappings from category_attributes rather than hardcoding
        // display values, so this test must provide that runtime definition.
        DB::table('category_attributes')->updateOrInsert(
            [
                'category_id' => $categoryId,
                'key' => 'property_type',
            ],
            [
                'label' => json_encode(['es' => 'Tipo de propiedad', 'en' => 'Property type']),
                'type' => 'select',
                'options' => json_encode([
                    ['value' => 'casa', 'label' => ['es' => 'Casa', 'en' => 'House']],
                    ['value' => 'departamento', 'label' => ['es' => 'Departamento', 'en' => 'Apartment']],
                ]),
                'required' => false,
                'sort_order' => 994,
            ]
        );

        $user = User::factory()->create();

        $historicalAd = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Legacy alias listing',
            'description' => 'Alias normalization contract',
            'price' => 1000,
            'location' => 'Veracruz',
            'category' => 'inmobiliaria',
            'condition' => 'usado',
            'status' => 'archived',
            'attributes' => ['tipo' => 'Casa'],
        ]));

        $historicalAlert = SearchAlert::query()->create([
            'user_id' => $user->id,
            'name' => 'Legacy alias search',
            'category_id' => $categoryId,
            'category_slug' => 'inmobiliaria',
            'filters' => ['tipo' => 'House'],
            'is_active' => true,
        ]);

        $migration = require database_path('migrations/2026_09_08_230000_normalize_category_attribute_option_values.php');
        $migration->up();

        $this->assertSame('casa', $historicalAd->fresh()->attributes['tipo']);
        $this->assertSame('casa', $historicalAlert->fresh()->filters['tipo']);

        $staleClientAd = Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Stale alias listing',
            'description' => 'Persistence alias boundary',
            'price' => 1200,
            'location' => 'Veracruz',
            'category' => 'inmobiliaria',
            'condition' => 'usado',
            'status' => 'draft',
            'attributes' => ['tipo' => 'Casa'],
        ]);

        $this->assertSame('casa', $staleClientAd->fresh()->attributes['tipo']);
    }
}
