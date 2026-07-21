<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const MODA_MARCA_OPTIONS = [
        'Zara', 'H&M', 'Bershka', 'Pull&Bear', 'Stradivarius', 'Mango', 'Massimo Dutti', 'Old Navy', 'Forever 21', 'Shein', 'C&A', 'Suburbia',
        'Levi\'s', 'Wrangler', 'Lee', 'Tommy Hilfiger', 'Calvin Klein', 'Guess', 'Ralph Lauren', 'Carhartt',
        'Nike', 'Adidas', 'Puma', 'Under Armour', 'Reebok', 'New Balance', 'Skechers', 'Vans', 'Converse', 'Fila', 'Crocs',
        'Cklass', 'Andrea', 'Flexi',
        'Michael Kors', 'Coach', 'Kate Spade', 'Louis Vuitton', 'Gucci', 'Prada',
        'Casio', 'Fossil', 'Citizen', 'Seiko', 'Swatch', 'Invicta', 'Rolex',
        'Pandora', 'Swarovski', 'Tous',
        'Otra',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'moda')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca_moda')
            ->update([
                'type' => 'select',
                'options' => json_encode(self::MODA_MARCA_OPTIONS),
                'updated_at' => now(),
            ]);

        $modeloExists = DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'modelo_moda')
            ->exists();

        if (! $modeloExists) {
            DB::table('category_attributes')->insert([
                'category_id' => $categoryId,
                'key' => 'modelo_moda',
                'label' => json_encode(['es' => 'Modelo / línea', 'en' => 'Model / line']),
                'type' => 'text',
                'options' => null,
                'required' => false,
                'sort_order' => 45,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'moda')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca_moda')
            ->update([
                'type' => 'text',
                'options' => null,
                'updated_at' => now(),
            ]);

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'modelo_moda')
            ->delete();
    }
};
