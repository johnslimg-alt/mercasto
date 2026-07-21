<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const DEPORTES_OPTIONS = [
        'Nike', 'Adidas', 'Puma', 'Under Armour', 'Umbro', 'Charly', 'Kappa',
        'Trek', 'Giant', 'Specialized', 'Cannondale', 'Scott', 'Merida', 'Bianchi', 'GT', 'Raleigh', 'Schwinn', 'Mercurio', 'Benotto', 'Turbo',
        'Shimano', 'Giro',
        'TRX', 'Everlast', 'Reebok',
        'Asics', 'Brooks', 'Saucony', 'New Balance', 'Hoka',
        'Coleman', 'The North Face', 'Columbia', 'Eureka', 'Ozark Trail',
        'Daiwa', 'Rapala', 'Pflueger',
        'Quiksilver', 'Billabong', 'Rip Curl', 'O\'Neill',
        'Garmin', 'Fitbit',
        'Otra',
    ];

    private const DEPORTES_OPTIONS_PREVIOUS = [
        'Nike', 'Adidas', 'Puma', 'Under Armour', 'Umbro', 'Charly', 'Kappa',
        'Shimano', 'Giro',
        'TRX', 'Everlast', 'Reebok',
        'Asics', 'Brooks', 'Saucony', 'New Balance', 'Hoka',
        'Coleman', 'The North Face', 'Columbia', 'Eureka', 'Ozark Trail',
        'Daiwa', 'Rapala', 'Pflueger',
        'Quiksilver', 'Billabong', 'Rip Curl', 'O\'Neill',
        'Garmin', 'Fitbit',
        'Otra',
    ];

    private function setOptions(array $options): void
    {
        $categoryId = DB::table('categories')->where('slug', 'deportes')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca')
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
        $this->setOptions(self::DEPORTES_OPTIONS);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->setOptions(self::DEPORTES_OPTIONS_PREVIOUS);
    }
};
