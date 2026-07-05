<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const HOGAR_MARCA_OPTIONS = [
        'IKEA',
        'Whirlpool', 'Mabe', 'LG', 'Samsung', 'GE', 'Frigidaire', 'Winia', 'Hisense', 'Midea', 'Daewoo', 'Acros', 'Koblenz', 'Oster', 'Black+Decker', 'Hamilton Beach', 'Philips', 'Panasonic', 'Rowenta',
        'Vasconia', 'Tramontina', 'Cinsa', 'T-fal',
        'Truper', 'Pretul', 'Urrea', 'Bosch', 'DeWalt', 'Makita', 'Milwaukee', 'Stanley', 'Total',
        'Husqvarna', 'Stihl', 'Toro', 'Craftsman',
        'Sylvania',
        'Steren', 'Hikvision', 'TP-Link', 'Yale', 'Kwikset', 'Ring', 'Dahua',
        'Otra',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'hogar')->value('id');

        if (! $categoryId) {
            return;
        }

        $exists = DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca_hogar')
            ->exists();

        if (! $exists) {
            DB::table('category_attributes')->insert([
                'category_id' => $categoryId,
                'key' => 'marca_hogar',
                'label' => json_encode(['es' => 'Marca', 'en' => 'Brand']),
                'type' => 'select',
                'options' => json_encode(self::HOGAR_MARCA_OPTIONS),
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
        $categoryId = DB::table('categories')->where('slug', 'hogar')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca_hogar')
            ->delete();
    }
};
