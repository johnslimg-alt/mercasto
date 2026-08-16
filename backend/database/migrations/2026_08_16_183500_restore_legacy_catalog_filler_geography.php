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
            'ciudad de méxico, cdmx' => ['Ciudad de México', 'Ciudad de México'],
            'guadalajara, jal' => ['Guadalajara', 'Jalisco'],
            'monterrey, nl' => ['Monterrey', 'Nuevo León'],
            'puebla, pue' => ['Puebla', 'Puebla'],
            'querétaro, qro' => ['Querétaro', 'Querétaro'],
            'cancún, roo' => ['Cancún', 'Quintana Roo'],
            'mérida, yuc' => ['Mérida', 'Yucatán'],
            'tijuana, bc' => ['Tijuana', 'Baja California'],
            'león, gto' => ['León', 'Guanajuato'],
            'veracruz, ver' => ['Veracruz', 'Veracruz'],
        ];

        foreach ($locations as $legacyLocation => [$city, $state]) {
            $base = DB::table('ads')
                ->where('is_catalog_filler', true)
                ->where('status', 'active')
                ->whereRaw('LOWER(TRIM(location)) = ?', [$legacyLocation]);

            (clone $base)
                ->where(function ($query): void {
                    $query->whereNull('city')->orWhereRaw("TRIM(city) = ''");
                })
                ->update(['city' => $city]);

            (clone $base)
                ->where(function ($query): void {
                    $query->whereNull('state')->orWhereRaw("TRIM(state) = ''");
                })
                ->update(['state' => $state]);

            (clone $base)->update(['location' => "{$city}, {$state}"]);
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive: this migration restores structured data
        // from known historical seed values and must not erase valid geography.
    }
};
