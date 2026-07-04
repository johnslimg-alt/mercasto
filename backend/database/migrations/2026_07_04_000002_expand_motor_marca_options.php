<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const NEW_OPTIONS = [
        'Chevrolet', 'Ford', 'RAM', 'Dodge', 'Jeep', 'Chrysler', 'GMC', 'Cadillac', 'Buick', 'Lincoln', 'Tesla',
        'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Suzuki', 'Subaru', 'Lexus', 'Acura', 'Infiniti', 'Isuzu', 'Kia', 'Hyundai', 'Genesis',
        'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'MINI', 'Smart',
        'SEAT', 'Renault', 'Peugeot', 'Citroën', 'Fiat', 'Alfa Romeo', 'Volvo', 'Land Rover', 'Jaguar',
        'BYD', 'MG', 'Chirey', 'JAC', 'GWM (Haval)', 'Changan', 'Omoda/Jaecoo', 'DFSK', 'Foton',
        'Scania', 'International', 'Freightliner', 'MAN', 'Iveco', 'Dina', 'Hino',
        'Otra',
    ];

    private const OLD_OPTIONS = ['Nissan', 'Toyota', 'Honda', 'Volkswagen', 'Chevrolet', 'Ford', 'Otra'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'motor')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca')
            ->update([
                'options' => json_encode(self::NEW_OPTIONS),
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $categoryId = DB::table('categories')->where('slug', 'motor')->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', 'marca')
            ->update([
                'options' => json_encode(self::OLD_OPTIONS),
                'updated_at' => now(),
            ]);
    }
};
