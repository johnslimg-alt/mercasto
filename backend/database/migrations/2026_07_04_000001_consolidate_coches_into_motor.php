<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Several "categories" rows are duplicates that the frontend already hides
     * from every category picker (see the "excluding duplicates" comment in
     * App.jsx's headerCategories / PostScreen.jsx's excludedSlugs) but were
     * never removed from the database, so they still show up via the API and
     * in the sitemap as empty dead ends. This re-applies the same consolidation
     * 2026_06_11_000003_consolidate_categories did (telefonos/informatica ->
     * electronica, bebes -> infantil, coleccionismo -> ocio) plus two new
     * instances of the same pattern: coches -> motor and deportes -> ocio.
     */
    private const MERGES = [
        'coches' => 'motor',
        'telefonos' => 'electronica',
        'informatica' => 'electronica',
        'bebes' => 'infantil',
        'coleccionismo' => 'ocio',
        'deportes' => 'ocio',
    ];

    public function up(): void
    {
        foreach (self::MERGES as $from => $to) {
            DB::table('ads')->where('category', $from)->update(['category' => $to]);
            DB::table('category_subscriptions')->where('category_slug', $from)->update(['category_slug' => $to]);
            DB::table('categories')->where('slug', $from)->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $categories = [
            ['slug' => 'coches', 'name' => ['es' => 'Coches', 'en' => 'Cars'], 'icon' => 'Car', 'sort_order' => 10],
            ['slug' => 'telefonos', 'name' => ['es' => 'Teléfonos', 'en' => 'Phones'], 'icon' => 'Smartphone', 'sort_order' => 90],
            ['slug' => 'deportes', 'name' => ['es' => 'Deportes y Náutica', 'en' => 'Sports'], 'icon' => 'Dumbbell', 'sort_order' => 100],
            ['slug' => 'bebes', 'name' => ['es' => 'Bebés', 'en' => 'Babies'], 'icon' => 'Baby', 'sort_order' => 120],
            ['slug' => 'informatica', 'name' => ['es' => 'Informática', 'en' => 'Computing'], 'icon' => 'Cpu', 'sort_order' => 160],
            ['slug' => 'coleccionismo', 'name' => ['es' => 'Coleccionismo', 'en' => 'Collectibles'], 'icon' => 'Star', 'sort_order' => 170],
        ];

        foreach ($categories as $cat) {
            $exists = DB::table('categories')->where('slug', $cat['slug'])->exists();
            if (!$exists) {
                DB::table('categories')->insert([
                    'slug' => $cat['slug'],
                    'name' => json_encode($cat['name']),
                    'icon' => $cat['icon'],
                    'sort_order' => $cat['sort_order'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
};
