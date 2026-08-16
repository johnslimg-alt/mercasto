<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ads') || ! Schema::hasColumns('ads', [
            'is_catalog_filler', 'status', 'location', 'city', 'state',
        ])) {
            return;
        }

        // Exact city-only values preserved by the historical TestAdsSeeder.
        // Every key is unique in that source list; there is no fuzzy matching or geocoding here.
        $locations = [
            'Aguascalientes' => 'Aguascalientes',
            'Tijuana' => 'Baja California',
            'Mexicali' => 'Baja California',
            'La Paz' => 'Baja California Sur',
            'Los Cabos' => 'Baja California Sur',
            'Campeche' => 'Campeche',
            'Tuxtla Gutiérrez' => 'Chiapas',
            'San Cristóbal' => 'Chiapas',
            'Chihuahua' => 'Chihuahua',
            'Ciudad Juárez' => 'Chihuahua',
            'Ciudad de México' => 'Ciudad de México',
            'Polanco' => 'Ciudad de México',
            'Coyoacán' => 'Ciudad de México',
            'Condesa' => 'Ciudad de México',
            'Saltillo' => 'Coahuila',
            'Torreón' => 'Coahuila',
            'Colima' => 'Colima',
            'Manzanillo' => 'Colima',
            'Durango' => 'Durango',
            'Toluca' => 'Estado de México',
            'Ecatepec' => 'Estado de México',
            'Naucalpan' => 'Estado de México',
            'León' => 'Guanajuato',
            'Guanajuato' => 'Guanajuato',
            'Acapulco' => 'Guerrero',
            'Chilpancingo' => 'Guerrero',
            'Pachuca' => 'Hidalgo',
            'Guadalajara' => 'Jalisco',
            'Zapopan' => 'Jalisco',
            'Lagos de Moreno' => 'Jalisco',
            'Morelia' => 'Michoacán',
            'Uruapan' => 'Michoacán',
            'Cuernavaca' => 'Morelos',
            'Tepic' => 'Nayarit',
            'Monterrey' => 'Nuevo León',
            'San Pedro Garza García' => 'Nuevo León',
            'Oaxaca' => 'Oaxaca',
            'Puerto Escondido' => 'Oaxaca',
            'Puebla' => 'Puebla',
            'Cholula' => 'Puebla',
            'Querétaro' => 'Querétaro',
            'Cancún' => 'Quintana Roo',
            'Playa del Carmen' => 'Quintana Roo',
            'Tulum' => 'Quintana Roo',
            'San Luis Potosí' => 'San Luis Potosí',
            'Culiacán' => 'Sinaloa',
            'Mazatlán' => 'Sinaloa',
            'Hermosillo' => 'Sonora',
            'Villahermosa' => 'Tabasco',
            'Tampico' => 'Tamaulipas',
            'Reynosa' => 'Tamaulipas',
            'Tlaxcala' => 'Tlaxcala',
            'Veracruz' => 'Veracruz',
            'Xalapa' => 'Veracruz',
            'Mérida' => 'Yucatán',
            'Valladolid' => 'Yucatán',
            'Zacatecas' => 'Zacatecas',
        ];

        foreach ($locations as $city => $state) {
            $ids = DB::table('ads')
                ->where('is_catalog_filler', true)
                ->where('status', 'active')
                ->whereRaw('LOWER(TRIM(location)) = LOWER(?)', [$city])
                ->where(function ($query): void {
                    $query->whereNull('city')
                        ->orWhereRaw("TRIM(city) = ''")
                        ->orWhereNull('state')
                        ->orWhereRaw("TRIM(state) = ''");
                })
                ->pluck('id');

            if ($ids->isEmpty()) {
                continue;
            }

            DB::table('ads')
                ->whereIn('id', $ids)
                ->where(function ($query): void {
                    $query->whereNull('city')->orWhereRaw("TRIM(city) = ''");
                })
                ->update(['city' => $city]);

            DB::table('ads')
                ->whereIn('id', $ids)
                ->where(function ($query): void {
                    $query->whereNull('state')->orWhereRaw("TRIM(state) = ''");
                })
                ->update(['state' => $state]);

            DB::table('ads')
                ->whereIn('id', $ids)
                ->update(['location' => "{$city}, {$state}"]);
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive: restored geography comes from the exact
        // historical seed source and must not be erased during a code rollback.
    }
};
