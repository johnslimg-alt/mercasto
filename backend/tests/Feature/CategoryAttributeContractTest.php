<?php

namespace Tests\Feature;

use App\Models\Ad;
use App\Models\Category;
use App\Models\SearchAlert;
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


    public function test_legacy_display_labels_are_normalized_across_persisted_consumers(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'inmobiliaria')->value('id');
        $user = User::factory()->create();

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

        // Bypass the model event so this row represents a genuinely historical
        // pre-canonicalization listing that must be repaired by the migration.
        $ad = Ad::withoutEvents(fn () => Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Legacy attribute value',
            'description' => 'Normalization contract',
            'price' => 1000,
            'location' => 'Veracruz',
            'category' => 'inmobiliaria',
            'condition' => 'usado',
            'status' => 'archived',
            'attributes' => ['legacy_property_type' => 'House'],
        ]));

        $scalarAlert = SearchAlert::query()->create([
            'user_id' => $user->id,
            'name' => 'Legacy scalar search',
            'category_id' => $categoryId,
            'category_slug' => 'inmobiliaria',
            'filters' => ['legacy_property_type' => 'Casa'],
            'is_active' => true,
        ]);
        $multiAlert = SearchAlert::query()->create([
            'user_id' => $user->id,
            'name' => 'Legacy multi search',
            'category_id' => $categoryId,
            'category_slug' => 'inmobiliaria',
            'filters' => ['legacy_property_type' => ['House', 'terreno']],
            'is_active' => true,
        ]);

        $migration = require database_path('migrations/2026_09_08_230000_normalize_category_attribute_option_values.php');
        $migration->up();

        $this->assertSame('casa', $ad->fresh()->attributes['legacy_property_type']);
        $this->assertSame('casa', $scalarAlert->fresh()->filters['legacy_property_type']);
        $this->assertSame(['casa', 'terreno'], $multiAlert->fresh()->filters['legacy_property_type']);

        // A stale browser draft/client may still submit a translated display label
        // after deployment. The persistence boundary must canonicalize it again.
        $staleClientAd = Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Stale draft attribute value',
            'description' => 'Persistence boundary contract',
            'price' => 1200,
            'location' => 'Veracruz',
            'category' => 'inmobiliaria',
            'condition' => 'usado',
            'status' => 'draft',
            'attributes' => ['legacy_property_type' => 'Casa'],
        ]);

        $this->assertSame('casa', $staleClientAd->fresh()->attributes['legacy_property_type']);
    }

    public function test_stale_clients_are_canonicalized_before_search_write_query_and_moderation_compare(): void
    {
        $categoryId = DB::table('categories')->insertGetId([
            'slug' => 'canonical-contract',
            'name' => json_encode(['es' => 'Contrato canonical', 'en' => 'Canonical contract']),
            'icon' => 'Tag',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('category_attributes')->insert([
            'category_id' => $categoryId,
            'key' => 'property_type',
            'label' => json_encode(['es' => 'Tipo de propiedad', 'en' => 'Property type']),
            'type' => 'select',
            'options' => json_encode([
                ['value' => 'casa', 'label' => ['es' => 'Casa', 'en' => 'House']],
                ['value' => 'terreno', 'label' => ['es' => 'Terreno', 'en' => 'Land']],
            ]),
            'required' => false,
            'sort_order' => 1,
        ]);
        $user = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Casa sin cambios',
            'description' => 'Descripción estable',
            'price' => 1500000,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => 'canonical-contract',
            'subcategory' => 'Casa',
            'condition' => 'usado',
            'attributes' => ['subcategory' => 'Casa', 'property_type' => 'casa'],
            'status' => 'active',
            'ai_moderation_status' => 'approved',
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/user/search-alerts', [
                'name' => 'Casa antigua',
                'category' => 'canonical-contract',
                'filters' => ['property_type' => 'Casa'],
            ])
            ->assertCreated()
            ->assertJsonPath('filters.property_type', 'casa');

        $this->getJson('/api/ads?category=canonical-contract&filters[property_type]=Casa')
            ->assertOk()
            ->assertJsonPath('data.0.id', $ad->id);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/ads/{$ad->id}", [
                'title' => 'Casa sin cambios',
                'description' => 'Descripción estable',
                'price' => 1500000,
                'location' => 'Veracruz',
                'state' => 'Veracruz',
                'city' => 'Veracruz',
                'latitude' => 19.1738,
                'longitude' => -96.1342,
                'category' => 'canonical-contract',
                'subcategory' => 'Casa',
                'condition' => 'usado',
                'attributes' => ['subcategory' => 'Casa', 'property_type' => 'Casa'],
                'existing_images' => [],
            ])
            ->assertOk()
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('attributes.property_type', 'casa');

        $this->assertSame('approved', $ad->fresh()->ai_moderation_status);
    }


    public function test_legacy_update_can_preserve_missing_global_subcategory_contract(): void
    {
        $category = Category::create([
            'slug' => 'legacy-edit-contract',
            'name' => ['es' => 'Legacy edit', 'en' => 'Legacy edit'],
            'icon' => 'Archive',
        ]);
        $user = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Legacy sin subcategoría',
            'description' => 'Contenido estable',
            'price' => 1200,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => $category->slug,
            'subcategory' => null,
            'condition' => 'usado',
            'attributes' => null,
            'status' => 'active',
        ]);

        $this->actingAs($user, 'sanctum')->postJson("/api/ads/{$ad->id}", [
            'title' => $ad->title,
            'description' => $ad->description,
            'price' => $ad->price,
            'location' => $ad->location,
            'state' => $ad->state,
            'city' => $ad->city,
            'latitude' => $ad->latitude,
            'longitude' => $ad->longitude,
            'category' => $ad->category,
            'condition' => $ad->condition,
            'existing_images' => [],
        ])->assertOk()->assertJsonPath('status', 'active');

        $ad->refresh();
        $this->assertNull($ad->subcategory);
        $this->assertSame('active', $ad->status);
    }

    public function test_legacy_update_still_requires_real_required_category_attributes(): void
    {
        $category = Category::create([
            'slug' => 'legacy-edit-required',
            'name' => ['es' => 'Legacy required', 'en' => 'Legacy required'],
            'icon' => 'Archive',
        ]);
        DB::table('category_attributes')->insert([
            'category_id' => $category->id,
            'key' => 'serial_number',
            'label' => json_encode(['es' => 'Serie', 'en' => 'Serial']),
            'type' => 'text',
            'options' => null,
            'required' => true,
            'sort_order' => 1,
        ]);
        $user = User::factory()->create();
        $ad = Ad::query()->create([
            'user_id' => $user->id,
            'title' => 'Legacy required',
            'description' => 'Contenido estable',
            'price' => 1200,
            'location' => 'Veracruz',
            'state' => 'Veracruz',
            'city' => 'Veracruz',
            'latitude' => 19.1738,
            'longitude' => -96.1342,
            'category' => $category->slug,
            'condition' => 'usado',
            'attributes' => null,
            'status' => 'active',
        ]);

        $this->actingAs($user, 'sanctum')->postJson("/api/ads/{$ad->id}", [
            'title' => $ad->title,
            'description' => $ad->description,
            'price' => $ad->price,
            'location' => $ad->location,
            'state' => $ad->state,
            'city' => $ad->city,
            'latitude' => $ad->latitude,
            'longitude' => $ad->longitude,
            'category' => $ad->category,
            'condition' => $ad->condition,
            'existing_images' => [],
        ])->assertStatus(422)->assertJsonValidationErrors(['attributes.serial_number']);
    }

}
