<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const MOTOR_OPTIONS = [
        'Chevrolet', 'Ford', 'RAM', 'Dodge', 'Jeep', 'Chrysler', 'GMC', 'Cadillac', 'Buick', 'Lincoln', 'Tesla',
        'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Suzuki', 'Subaru', 'Lexus', 'Acura', 'Infiniti', 'Isuzu', 'Kia', 'Hyundai', 'Genesis',
        'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'MINI', 'Smart',
        'SEAT', 'Renault', 'Peugeot', 'Citroën', 'Fiat', 'Alfa Romeo', 'Volvo', 'Land Rover', 'Jaguar',
        'BYD', 'MG', 'Chirey', 'JAC', 'GWM (Haval)', 'Changan', 'Omoda/Jaecoo', 'DFSK', 'Foton',
        'Scania', 'International', 'Freightliner', 'MAN', 'Iveco', 'Dina', 'Hino',
        'Yamaha', 'Kawasaki', 'Harley-Davidson', 'Ducati', 'Triumph', 'KTM', 'Royal Enfield',
        'Vespa/Piaggio', 'Italika', 'Vento', 'Bajaj', 'Benelli', 'Husqvarna',
        'Segway-Ninebot', 'InMotion', 'KingSong', 'Zacua', 'Kandi',
        'Club Car', 'E-Z-GO', 'Garia',
        'Otra',
    ];

    private const MOTOR_OPTIONS_PREVIOUS = [
        'Chevrolet', 'Ford', 'RAM', 'Dodge', 'Jeep', 'Chrysler', 'GMC', 'Cadillac', 'Buick', 'Lincoln', 'Tesla',
        'Toyota', 'Honda', 'Nissan', 'Mazda', 'Mitsubishi', 'Suzuki', 'Subaru', 'Lexus', 'Acura', 'Infiniti', 'Isuzu', 'Kia', 'Hyundai', 'Genesis',
        'Volkswagen', 'BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'MINI', 'Smart',
        'SEAT', 'Renault', 'Peugeot', 'Citroën', 'Fiat', 'Alfa Romeo', 'Volvo', 'Land Rover', 'Jaguar',
        'BYD', 'MG', 'Chirey', 'JAC', 'GWM (Haval)', 'Changan', 'Omoda/Jaecoo', 'DFSK', 'Foton',
        'Scania', 'International', 'Freightliner', 'MAN', 'Iveco', 'Dina', 'Hino',
        'Otra',
    ];

    private const ELECTRONICA_OPTIONS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Sony', 'LG', 'Dell', 'HP', 'DJI', 'Autel', 'Hubsan', 'Parrot', 'Otra'];

    private const ELECTRONICA_OPTIONS_PREVIOUS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Sony', 'LG', 'Dell', 'HP', 'Otra'];

    private function setOptions(string $categorySlug, string $key, array $options): void
    {
        $categoryId = DB::table('categories')->where('slug', $categorySlug)->value('id');

        if (! $categoryId) {
            return;
        }

        DB::table('category_attributes')
            ->where('category_id', $categoryId)
            ->where('key', $key)
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
        $this->setOptions('motor', 'marca', self::MOTOR_OPTIONS);
        $this->setOptions('electronica', 'marca', self::ELECTRONICA_OPTIONS);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->setOptions('motor', 'marca', self::MOTOR_OPTIONS_PREVIOUS);
        $this->setOptions('electronica', 'marca', self::ELECTRONICA_OPTIONS_PREVIOUS);
    }
};
