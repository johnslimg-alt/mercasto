<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const OCIO_MARCA_OPTIONS = [
        'Sony', 'Microsoft', 'Nintendo', 'Sega',
        'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'Polaroid', 'Panasonic',
        'Yamaha', 'Fender', 'Gibson', 'Casio', 'Roland', 'Ibanez', 'Pearl',
        'Funko', 'Lego',
        'Coleman', 'The North Face',
        'Otra',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'ocio')->value('id');

        if (! $categoryId) {
            return;
        }

        $exists = DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca_ocio')
            ->exists();

        if (! $exists) {
            DB::table('category_attributes')->insert([
                'category_id' => $categoryId,
                'key' => 'marca_ocio',
                'label' => json_encode(['es' => 'Marca', 'en' => 'Brand']),
                'type' => 'select',
                'options' => json_encode(self::OCIO_MARCA_OPTIONS),
                'required' => false,
                'sort_order' => 25,
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
        $categoryId = DB::table('categories')->where('slug', 'ocio')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca_ocio')
            ->delete();
    }
};
