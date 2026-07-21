<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const OCIO_OPTIONS = [
        'Sony', 'Microsoft', 'Nintendo', 'Sega',
        'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'Polaroid', 'Panasonic',
        'Yamaha', 'Fender', 'Gibson', 'Casio', 'Roland', 'Ibanez', 'Pearl',
        'Funko', 'Lego',
        'Coleman', 'The North Face',
        'Trek', 'Giant', 'Specialized', 'Mercurio', 'Benotto',
        'TRX', 'Everlast', 'Reebok',
        'Asics', 'Brooks', 'New Balance',
        'Daiwa', 'Rapala', 'Pflueger', 'Shimano',
        'Quiksilver', 'Billabong', 'Rip Curl',
        'Otra',
    ];

    private const OCIO_OPTIONS_PREVIOUS = [
        'Sony', 'Microsoft', 'Nintendo', 'Sega',
        'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'Polaroid', 'Panasonic',
        'Yamaha', 'Fender', 'Gibson', 'Casio', 'Roland', 'Ibanez', 'Pearl',
        'Funko', 'Lego',
        'Coleman', 'The North Face',
        'Otra',
    ];

    private function setOptions(array $options): void
    {
        $categoryId = DB::table('categories')->where('slug', 'ocio')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca_ocio')
            ->update([
                'options' => json_encode($options),
                'updated_at' => now(),
            ]);
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->setOptions(self::OCIO_OPTIONS);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->setOptions(self::OCIO_OPTIONS_PREVIOUS);
    }
};
