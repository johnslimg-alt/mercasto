<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CategoryAttributeContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_options_keep_canonical_values_and_ranges_keep_metadata(): void
    {
        Cache::flush();
        $categoryId = DB::table('categories')->where('slug', 'inmobiliaria')->value('id');
        $this->assertNotNull($categoryId);

        DB::table('category_attributes')->insert([
            [
                'category_id' => $categoryId,
                'key' => 'contract_property_type',
                'label' => json_encode(['es' => 'Tipo', 'en' => 'Type']),
                'type' => 'select',
                'options' => json_encode([
                    ['value' => 'casa', 'label' => ['es' => 'Casa', 'en' => 'House']],
                    ['value' => 'departamento', 'label' => ['es' => 'Departamento', 'en' => 'Apartment']],
                ]),
                'required' => true,
                'sort_order' => 991,
            ],
            [
                'category_id' => $categoryId,
                'key' => 'contract_area',
                'label' => json_encode(['es' => 'Área', 'en' => 'Area']),
                'type' => 'range',
                'options' => json_encode(['min' => 10, 'max' => 1000, 'step' => 10]),
                'required' => false,
                'sort_order' => 992,
            ],
        ]);

        $data = collect($this->getJson('/api/category-attributes?category=inmobiliaria')->assertOk()->json());
        $select = $data->firstWhere('key', 'contract_property_type');
        $range = $data->firstWhere('key', 'contract_area');

        $this->assertSame('Tipo', $select['label']);
        $this->assertSame('casa', $select['options'][0]['value']);
        $this->assertSame('Casa', $select['options'][0]['label']);
        $this->assertSame('departamento', $select['options'][1]['value']);
        $this->assertSame(['min' => 10, 'max' => 1000, 'step' => 10], $range['range']);
        $this->assertNull($range['options']);
    }

    public function test_legacy_display_labels_are_normalized_to_canonical_values(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'inmobiliaria')->value('id');
        DB::table('category_attributes')->insert([
            'category_id' => $categoryId,
            'key' => 'legacy_property_type',
            'label' => json_encode(['es' => 'Tipo heredado', 'en' => 'Legacy type']),
            'type' => 'select',
            'options' => json_encode([
                ['value' => 'casa', 'label' => ['es' => 'Casa', 'en' => 'House']],
                ['value' => 'terreno', 'label' => ['es' => 'Terreno', 'en' => 'Land']],
            ]),
            'required' => false,
            'sort_order' => 993,
        ]);
        $ad = Ad::query()->create([
            'user_id' => User::factory()->create()->id,
            'title' => 'Legacy attribute value',
            'description' => 'Normalization contract',
            'price' => 1000,
            'location' => 'Veracruz',
            'category' => 'inmobiliaria',
            'condition' => 'usado',
            'status' => 'archived',
            'attributes' => ['legacy_property_type' => 'House'],
        ]);

        $migration = require database_path('migrations/2026_09_08_230000_normalize_category_attribute_option_values.php');
        $migration->up();

        $this->assertSame('casa', $ad->fresh()->attributes['legacy_property_type']);
    }
}
