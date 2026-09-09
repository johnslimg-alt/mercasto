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
