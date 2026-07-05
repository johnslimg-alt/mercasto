<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const DEPORTES_OPTIONS = [
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

    private const INFANTIL_OPTIONS = [
        'Lego', 'Fisher-Price', 'Mattel', 'Hasbro', 'Hot Wheels', 'Barbie', 'Nerf', 'VTech', 'Playskool',
        'Carter\'s', 'OshKosh B\'gosh', 'Gerber',
        'Norma', 'Scribe', 'BIC', 'Pelikan',
        'Chicco', 'Graco', 'Britax', 'Evenflo', 'Peg Pérego', 'Bugaboo', 'Cybex', 'Safety 1st',
        'Otra',
    ];

    private function setSelect(string $categorySlug, string $key, array $options): void
    {
        $categoryId = DB::table('categories')->where('slug', $categorySlug)->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', $key)
            ->update([
                'type' => 'select',
                'options' => json_encode($options),
                'updated_at' => now(),
            ]);
    }

    private function setText(string $categorySlug, string $key): void
    {
        $categoryId = DB::table('categories')->where('slug', $categorySlug)->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', $key)
            ->update([
                'type' => 'text',
                'options' => null,
                'updated_at' => now(),
            ]);
    }

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->setSelect('deportes', 'marca', self::DEPORTES_OPTIONS);
        $this->setSelect('infantil', 'marca', self::INFANTIL_OPTIONS);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->setText('deportes', 'marca');
        $this->setText('infantil', 'marca');
    }
};
