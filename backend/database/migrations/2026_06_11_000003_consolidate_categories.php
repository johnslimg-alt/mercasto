<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Reassign ads to the consolidated categories
        DB::table('ads')
            ->whereIn('category', ['telefonos', 'telefonia', 'informatica'])
            ->update(['category' => 'electronica']);

        DB::table('ads')
            ->where('category', 'bebes')
            ->update(['category' => 'infantil']);

        DB::table('ads')
            ->where('category', 'coleccionismo')
            ->update(['category' => 'ocio']);

        // Update category subscriptions
        DB::table('category_subscriptions')
            ->whereIn('category_slug', ['telefonos', 'telefonia', 'informatica'])
            ->update(['category_slug' => 'electronica']);

        DB::table('category_subscriptions')
            ->where('category_slug', 'bebes')
            ->update(['category_slug' => 'infantil']);

        DB::table('category_subscriptions')
            ->where('category_slug', 'coleccionismo')
            ->update(['category_slug' => 'ocio']);

        // Delete the obsolete categories from categories table
        DB::table('categories')
            ->whereIn('slug', ['telefonos', 'telefonia', 'informatica', 'bebes', 'coleccionismo'])
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Typically hard to revert completely without manual tracking of original category of each ad,
        // but we can re-insert the categories at least
        $categories = [
            ['slug' => 'telefonia', 'name' => json_encode(['es' => 'Telefonía', 'en' => 'Phones']), 'icon' => 'Smartphone', 'sort_order' => 6],
            ['slug' => 'telefonos', 'name' => json_encode(['es' => 'Teléfonos', 'en' => 'Phones']), 'icon' => 'Smartphone', 'sort_order' => 90],
            ['slug' => 'bebes', 'name' => json_encode(['es' => 'Bebés', 'en' => 'Babies']), 'icon' => 'Baby', 'sort_order' => 120],
            ['slug' => 'informatica', 'name' => json_encode(['es' => 'Informática', 'en' => 'Computing']), 'icon' => 'Cpu', 'sort_order' => 160],
            ['slug' => 'coleccionismo', 'name' => json_encode(['es' => 'Coleccionismo', 'en' => 'Collectibles']), 'icon' => 'Star', 'sort_order' => 170],
        ];

        foreach ($categories as $cat) {
            $exists = DB::table('categories')->where('slug', $cat['slug'])->exists();
            if (!$exists) {
                $cat['created_at'] = now();
                $cat['updated_at'] = now();
                DB::table('categories')->insert($cat);
            }
        }
    }
};
