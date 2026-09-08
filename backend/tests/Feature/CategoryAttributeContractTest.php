<?php

namespace Tests\Feature;

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

        $this->assertSame('casa', $select['options'][0]['value']);
        $this->assertSame('Casa', $select['options'][0]['label']);
        $this->assertSame('departamento', $select['options'][1]['value']);
        $this->assertSame(['min' => 10, 'max' => 1000, 'step' => 10], $range['range']);
        $this->assertNull($range['options']);
    }
}
