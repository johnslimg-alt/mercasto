<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class BackfillAdCoordinates extends Command
{
    protected $signature = 'ads:backfill-coordinates
        {--dry-run : Count rows without updating}
        {--force : Recalculate coordinates even when they already exist}';

    protected $description = 'Fill approximate Mexico coordinates for ads that do not have map coordinates yet.';

    public function handle(): int
    {
        $query = Ad::query();

        if (!$this->option('force')) {
            $query->where(function ($q) {
                $q->whereNull('latitude')->orWhereNull('longitude');
            });
        }

        if ($this->option('dry-run')) {
            $this->info('Ads missing coordinates: ' . $query->count());
            return self::SUCCESS;
        }

        $updated = 0;

        $query->select(['id', 'location', 'state'])->chunkById(100, function ($ads) use (&$updated) {
            foreach ($ads as $ad) {
                [$lat, $lng] = $this->resolveCoordinates($ad->location, $ad->state);

                $ad->forceFill([
                    'latitude' => $lat,
                    'longitude' => $lng,
                ])->save();

                $updated++;
            }
        });

        $this->info("Backfilled coordinates for {$updated} ads.");

        return self::SUCCESS;
    }

    private function resolveCoordinates(?string $location, ?string $state): array
    {
        $centroids = [
            'aguascalientes' => [21.8853, -102.2916],
            'ags' => [21.8853, -102.2916],
            'baja california sur' => [26.0444, -111.6661],
            'bcs' => [26.0444, -111.6661],
            'baja california' => [30.8406, -115.2838],
            'bc' => [30.8406, -115.2838],
            'campeche' => [19.8301, -90.5349],
            'camp' => [19.8301, -90.5349],
            'chiapas' => [16.7569, -93.1292],
            'chis' => [16.7569, -93.1292],
            'chihuahua' => [28.6330, -106.0691],
            'chih' => [28.6330, -106.0691],
            'ciudad de mexico' => [19.4326, -99.1332],
            'ciudad de méxico' => [19.4326, -99.1332],
            'cdmx' => [19.4326, -99.1332],
            'coahuila' => [27.0587, -101.7068],
            'coah' => [27.0587, -101.7068],
            'colima' => [19.2433, -103.7247],
            'col' => [19.2433, -103.7247],
            'durango' => [24.0277, -104.6532],
            'dgo' => [24.0277, -104.6532],
            'guanajuato' => [21.0190, -101.2574],
            'gto' => [21.0190, -101.2574],
            'guerrero' => [17.4392, -99.5451],
            'gro' => [17.4392, -99.5451],
            'hidalgo' => [20.0911, -98.7624],
            'hgo' => [20.0911, -98.7624],
            'jalisco' => [20.6597, -103.3496],
            'jal' => [20.6597, -103.3496],
            'guadalajara' => [20.6597, -103.3496],
            'puerto vallarta' => [20.6534, -105.2253],
            'estado de mexico' => [19.3565, -99.6312],
            'estado de méxico' => [19.3565, -99.6312],
            'edomex' => [19.3565, -99.6312],
            'mexico' => [19.3565, -99.6312],
            'méxico' => [19.3565, -99.6312],
            'michoacan' => [19.5665, -101.7068],
            'michoacán' => [19.5665, -101.7068],
            'mich' => [19.5665, -101.7068],
            'morelos' => [18.6813, -99.1013],
            'mor' => [18.6813, -99.1013],
            'nayarit' => [21.7514, -104.8455],
            'nay' => [21.7514, -104.8455],
            'nuevo leon' => [25.5922, -100.0574],
            'nuevo león' => [25.5922, -100.0574],
            'nl' => [25.5922, -100.0574],
            'monterrey' => [25.6866, -100.3161],
            'oaxaca' => [17.0732, -96.7266],
            'oax' => [17.0732, -96.7266],
            'puebla' => [19.0414, -98.2063],
            'pue' => [19.0414, -98.2063],
            'queretaro' => [20.5888, -100.3899],
            'querétaro' => [20.5888, -100.3899],
            'qro' => [20.5888, -100.3899],
            'quintana roo' => [19.1847, -88.4753],
            'roo' => [19.1847, -88.4753],
            'cancun' => [21.1619, -86.8515],
            'cancún' => [21.1619, -86.8515],
            'san luis potosi' => [22.1565, -100.9855],
            'san luis potosí' => [22.1565, -100.9855],
            'slp' => [22.1565, -100.9855],
            'sinaloa' => [25.1721, -107.4795],
            'sin' => [25.1721, -107.4795],
            'sonora' => [29.2972, -110.3309],
            'son' => [29.2972, -110.3309],
            'tabasco' => [17.8409, -92.6189],
            'tab' => [17.8409, -92.6189],
            'tamaulipas' => [24.2669, -98.8363],
            'tamps' => [24.2669, -98.8363],
            'tlaxcala' => [19.3182, -98.2375],
            'tlax' => [19.3182, -98.2375],
            'veracruz' => [19.1738, -96.1342],
            'ver' => [19.1738, -96.1342],
            'yucatan' => [20.7099, -89.0943],
            'yucatán' => [20.7099, -89.0943],
            'yuc' => [20.7099, -89.0943],
            'merida' => [20.9674, -89.5926],
            'mérida' => [20.9674, -89.5926],
            'zacatecas' => [22.7709, -102.5832],
            'zac' => [22.7709, -102.5832],
        ];

        $haystack = Str::of(trim(($location ?? '') . ' ' . ($state ?? '')))
            ->lower()
            ->ascii()
            ->toString();

        foreach ($centroids as $name => $coords) {
            $needle = Str::of($name)->lower()->ascii()->toString();
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return $coords;
            }
        }

        return [23.6345, -102.5528];
    }
}
