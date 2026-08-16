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

        $locations = [
            'aguascalientes, ags' => ['Aguascalientes', 'Aguascalientes'],
            'tijuana, bc' => ['Tijuana', 'Baja California'],
            'mexicali, bc' => ['Mexicali', 'Baja California'],
            'la paz, bcs' => ['La Paz', 'Baja California Sur'],
            'los cabos, bcs' => ['Los Cabos', 'Baja California Sur'],
            'campeche, camp' => ['Campeche', 'Campeche'],
            'tuxtla gutiérrez, chis' => ['Tuxtla Gutiérrez', 'Chiapas'],
            'san cristóbal, chis' => ['San Cristóbal', 'Chiapas'],
            'chihuahua, chih' => ['Chihuahua', 'Chihuahua'],
            'ciudad juárez, chih' => ['Ciudad Juárez', 'Chihuahua'],
            'ciudad de méxico, cdmx' => ['Ciudad de México', 'Ciudad de México'],
            'polanco, cdmx' => ['Polanco', 'Ciudad de México'],
            'coyoacán, cdmx' => ['Coyoacán', 'Ciudad de México'],
            'condesa, cdmx' => ['Condesa', 'Ciudad de México'],
            'saltillo, coah' => ['Saltillo', 'Coahuila'],
            'torreón, coah' => ['Torreón', 'Coahuila'],
            'colima, col' => ['Colima', 'Colima'],
            'manzanillo, col' => ['Manzanillo', 'Colima'],
            'durango, dgo' => ['Durango', 'Durango'],
            'toluca, edomex' => ['Toluca', 'Estado de México'],
            'ecatepec, edomex' => ['Ecatepec', 'Estado de México'],
            'naucalpan, edomex' => ['Naucalpan', 'Estado de México'],
            'león, gto' => ['León', 'Guanajuato'],
            'guanajuato, gto' => ['Guanajuato', 'Guanajuato'],
            'acapulco, gro' => ['Acapulco', 'Guerrero'],
            'chilpancingo, gro' => ['Chilpancingo', 'Guerrero'],
            'pachuca, hgo' => ['Pachuca', 'Hidalgo'],
            'guadalajara, jal' => ['Guadalajara', 'Jalisco'],
            'zapopan, jal' => ['Zapopan', 'Jalisco'],
            'lagos de moreno, jal' => ['Lagos de Moreno', 'Jalisco'],
            'morelia, mich' => ['Morelia', 'Michoacán'],
            'uruapan, mich' => ['Uruapan', 'Michoacán'],
            'cuernavaca, mor' => ['Cuernavaca', 'Morelos'],
            'tepic, nay' => ['Tepic', 'Nayarit'],
            'monterrey, nl' => ['Monterrey', 'Nuevo León'],
            'san pedro garza garcía, nl' => ['San Pedro Garza García', 'Nuevo León'],
            'oaxaca, oax' => ['Oaxaca', 'Oaxaca'],
            'puerto escondido, oax' => ['Puerto Escondido', 'Oaxaca'],
            'puebla, pue' => ['Puebla', 'Puebla'],
            'cholula, pue' => ['Cholula', 'Puebla'],
            'querétaro, qro' => ['Querétaro', 'Querétaro'],
            'cancún, roo' => ['Cancún', 'Quintana Roo'],
            'playa del carmen, roo' => ['Playa del Carmen', 'Quintana Roo'],
            'tulum, roo' => ['Tulum', 'Quintana Roo'],
            'san luis potosí, slp' => ['San Luis Potosí', 'San Luis Potosí'],
            'culiacán, sin' => ['Culiacán', 'Sinaloa'],
            'mazatlán, sin' => ['Mazatlán', 'Sinaloa'],
            'hermosillo, son' => ['Hermosillo', 'Sonora'],
            'villahermosa, tab' => ['Villahermosa', 'Tabasco'],
            'tampico, tamps' => ['Tampico', 'Tamaulipas'],
            'reynosa, tamps' => ['Reynosa', 'Tamaulipas'],
            'tlaxcala, tlax' => ['Tlaxcala', 'Tlaxcala'],
            'veracruz, ver' => ['Veracruz', 'Veracruz'],
            'xalapa, ver' => ['Xalapa', 'Veracruz'],
            'mérida, yuc' => ['Mérida', 'Yucatán'],
            'valladolid, yuc' => ['Valladolid', 'Yucatán'],
            'zacatecas, zac' => ['Zacatecas', 'Zacatecas'],
        ];

        foreach ($locations as $legacyLocation => [$city, $state]) {
            $ids = DB::table('ads')
                ->where('is_catalog_filler', true)
                ->where('status', 'active')
                ->whereRaw('LOWER(TRIM(location)) = ?', [$legacyLocation])
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
        // Intentionally non-destructive: exact historical seed geography is valid
        // structured data and must not be erased during a code rollback.
    }
};
