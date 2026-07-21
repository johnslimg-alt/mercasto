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
        'Sea-Doo', 'Bayliner', 'Sea Ray', 'Bertram', 'Azimut', 'Beneteau', 'Boston Whaler', 'Chaparral', 'Four Winns',
        'Otra',
    ];

    private const MOTOR_OPTIONS_PREVIOUS = [
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

    private const DEPORTES_OPTIONS = [
        'Nike', 'Adidas', 'Puma', 'Under Armour', 'Umbro', 'Charly', 'Kappa',
        'Trek', 'Giant', 'Specialized', 'Cannondale', 'Scott', 'Merida', 'Bianchi', 'GT', 'Raleigh', 'Schwinn', 'Mercurio', 'Benotto', 'Turbo',
        'Shimano', 'Giro',
        'TRX', 'Everlast', 'Reebok',
        'Asics', 'Brooks', 'Saucony', 'New Balance', 'Hoka',
        'Coleman', 'The North Face', 'Columbia', 'Eureka', 'Ozark Trail',
        'Daiwa', 'Rapala', 'Pflueger',
        'Quiksilver', 'Billabong', 'Rip Curl', 'O\'Neill',
        'Zodiac', 'Bestway', 'Sevylor', 'Mercury', 'Evinrude', 'Suzuki Marine',
        'Garmin', 'Fitbit',
        'Otra',
    ];

    private const DEPORTES_OPTIONS_PREVIOUS = [
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
        $this->setOptions('deportes', 'marca', self::DEPORTES_OPTIONS);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->setOptions('motor', 'marca', self::MOTOR_OPTIONS_PREVIOUS);
        $this->setOptions('deportes', 'marca', self::DEPORTES_OPTIONS_PREVIOUS);
    }
};
