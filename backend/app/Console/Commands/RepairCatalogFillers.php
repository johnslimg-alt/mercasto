<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class RepairCatalogFillers extends Command
{
    private const LEGACY_LOCATION_MAP = [
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

    protected $signature = 'ads:repair-catalog-fillers {--apply : Apply repairs; without this flag the command is read-only}';
    protected $description = 'Repair active editorial catalog references without modifying genuine user listings.';

    public function handle(): int
    {
        $query = Ad::query()
            ->where('is_catalog_filler', true)
            ->where('status', 'active');

        $total = (clone $query)->count();
        $this->info("Active catalog references: {$total}");

        if (! $this->option('apply')) {
            $this->comment('Preview only. Pass --apply to replace legacy filler images with unique local editorial covers, approve editorial references, and restore structured geography from known legacy seed locations.');
            return self::SUCCESS;
        }

        $updated = 0;
        $geographyNormalized = 0;
        $query->orderBy('id')->chunkById(200, function ($ads) use (&$updated, &$geographyNormalized): void {
            foreach ($ads as $ad) {
                $path = 'ads/catalog/reference-' . $ad->id . '.svg';
                if (! Storage::disk('public')->put($path, $this->coverSvg($ad))) {
                    throw new RuntimeException("Unable to write catalog cover for filler #{$ad->id}");
                }

                $attributes = is_array($ad->attributes) ? $ad->attributes : [];
                $attributes['editorial_reference'] = true;
                $attributes['catalog_cover_key'] = 'reference-' . $ad->id;

                $repair = [
                    'attributes' => $attributes,
                    'image_url' => json_encode([$path], JSON_UNESCAPED_SLASHES),
                    'generated_cover' => true,
                    'ai_moderation_status' => 'approved',
                    'ai_moderation_reason' => 'Referencia editorial de catálogo validada por Mercasto; no corresponde a una publicación de usuario.',
                    'ai_moderation_confidence' => 1,
                    'ai_moderated_at' => now(),
                    'expires_at' => null,
                    'reminder_sent_at' => null,
                ];

                $location = trim((string) $ad->location);
                $city = trim((string) $ad->city);
                $state = trim((string) $ad->state);

                if ($location === '') {
                    $parts = array_values(array_unique(array_filter([$city, $state], fn (string $part): bool => $part !== '')));
                    if ($parts !== []) {
                        $repair['location'] = implode(', ', $parts);
                    }
                } else {
                    $legacyGeography = $this->legacyGeography($location);
                    if ($legacyGeography !== null && ($city === '' || $state === '')) {
                        [$legacyCity, $legacyState] = $legacyGeography;
                        if ($city === '') {
                            $repair['city'] = $legacyCity;
                        }
                        if ($state === '') {
                            $repair['state'] = $legacyState;
                        }
                        $repair['location'] = implode(', ', [
                            $city !== '' ? $city : $legacyCity,
                            $state !== '' ? $state : $legacyState,
                        ]);
                        $geographyNormalized++;
                    }
                }

                $ad->forceFill($repair)->saveQuietly();
                $updated++;
            }
        });

        $this->info("Catalog filler repair complete: {$updated} active reference(s) normalized; {$geographyNormalized} legacy geography record(s) restored.");
        return self::SUCCESS;
    }

    private function legacyGeography(string $location): ?array
    {
        $key = mb_strtolower(preg_replace('/\s+/', ' ', trim($location)) ?? trim($location), 'UTF-8');

        return self::LEGACY_LOCATION_MAP[$key] ?? null;
    }

    private function coverSvg(Ad $ad): string
    {
        $palette = ['#0F172A', '#1E3A8A', '#155E75', '#365314', '#7C2D12', '#581C87', '#9F1239', '#134E4A'];
        $accent = $palette[abs(crc32($ad->category . ':' . $ad->id)) % count($palette)];
        $title = htmlspecialchars((string) $ad->title, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $category = htmlspecialchars(mb_strtoupper(str_replace('_', ' ', (string) $ad->category)), ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $price = htmlspecialchars(number_format((float) $ad->price, 0, '.', ',') . ' MXN', ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $reference = 'REF-' . $ad->id;

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="{$title}">
  <rect width="1200" height="900" fill="#F8FAFC"/>
  <rect x="48" y="48" width="1104" height="804" rx="52" fill="{$accent}"/>
  <circle cx="1030" cy="170" r="180" fill="#84CC16" opacity=".18"/>
  <circle cx="170" cy="760" r="230" fill="#FFFFFF" opacity=".08"/>
  <text x="105" y="155" font-family="Arial,Helvetica,sans-serif" font-size="31" font-weight="700" fill="#BEF264">{$category}</text>
  <text x="105" y="355" font-family="Arial,Helvetica,sans-serif" font-size="54" font-weight="800" fill="#FFFFFF">{$title}</text>
  <rect x="105" y="650" width="430" height="104" rx="28" fill="#84CC16"/>
  <text x="145" y="718" font-family="Arial,Helvetica,sans-serif" font-size="42" font-weight="800" fill="#0F172A">{$price}</text>
  <text x="105" y="805" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700" fill="#CBD5E1">Mercasto · referencia editorial · {$reference}</text>
</svg>
SVG;
    }
}
