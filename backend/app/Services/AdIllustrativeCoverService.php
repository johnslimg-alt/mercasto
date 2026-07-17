<?php

namespace App\Services;

use App\Models\Ad;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdIllustrativeCoverService
{
    public function ensureCover(Ad $ad): ?string
    {
        $images = $this->images($ad->image_url);
        $originals = array_values(array_filter(
            $images,
            fn (string $image) => ! str_starts_with($image, 'ads/placeholders/')
        ));
        $placeholders = array_values(array_filter(
            $images,
            fn (string $image) => str_starts_with($image, 'ads/placeholders/')
        ));

        // A real seller photo always wins. Remove the generated cover so it can never
        // remain as the first image after the seller updates the listing.
        if ($originals !== []) {
            if ($placeholders !== [] || $ad->generated_cover) {
                if ($placeholders !== []) {
                    Storage::disk('public')->delete($placeholders);
                }
                $ad->forceFill([
                    'image_url' => json_encode($originals, JSON_UNESCAPED_SLASHES),
                    'generated_cover' => false,
                ])->saveQuietly();
            }

            return null;
        }

        if ($placeholders !== []) {
            if (! $ad->generated_cover) {
                $ad->forceFill(['generated_cover' => true])->saveQuietly();
            }
            return $placeholders[0];
        }

        $path = 'ads/placeholders/' . Str::uuid() . '.svg';
        Storage::disk('public')->put($path, $this->svg($ad));

        $ad->forceFill([
            'image_url' => json_encode([$path], JSON_UNESCAPED_SLASHES),
            'generated_cover' => true,
        ])->saveQuietly();

        return $path;
    }

    public function hasOriginalImages(Ad $ad): bool
    {
        foreach ($this->images($ad->image_url) as $image) {
            if (! str_starts_with($image, 'ads/placeholders/')) {
                return true;
            }
        }

        return false;
    }

    public function originalImages(Ad $ad): array
    {
        return array_values(array_filter(
            $this->images($ad->image_url),
            fn (string $image) => ! str_starts_with($image, 'ads/placeholders/')
        ));
    }

    private function images(mixed $value): array
    {
        if (is_array($value)) {
            return array_values(array_filter($value, 'is_string'));
        }

        if (! is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            return array_values(array_filter($decoded, 'is_string'));
        }

        return [$value];
    }

    private function svg(Ad $ad): string
    {
        $category = $this->categoryLabel((string) $ad->category);
        $title = $this->plainText((string) $ad->title, 58);
        $summary = $this->plainText((string) $ad->description, 145);
        $lines = $this->wrap($summary, 42, 3);
        $escapedCategory = $this->escape($category);
        $escapedTitle = $this->escape($title !== '' ? $title : $category);
        $descriptionTspans = collect($lines)
            ->values()
            ->map(fn (string $line, int $index) => '<tspan x="92" dy="' . ($index === 0 ? '0' : '42') . '">' . $this->escape($line) . '</tspan>')
            ->implode('');

        return <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="Imagen ilustrativa para {$escapedTitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
    <radialGradient id="glow" cx="75%" cy="20%" r="65%">
      <stop offset="0" stop-color="#84cc16" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#84cc16" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="900" fill="url(#bg)"/>
  <rect width="1200" height="900" fill="url(#glow)"/>
  <circle cx="1000" cy="160" r="210" fill="#84cc16" opacity="0.10"/>
  <circle cx="1030" cy="150" r="120" fill="#84cc16" opacity="0.12"/>
  <path d="M1010 74c-77 0-140 62-140 139 0 104 140 174 140 174s140-70 140-174c0-77-63-139-140-139z" fill="#84cc16" opacity="0.92"/>
  <path d="M950 260v-92l60 52 60-52v92" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="72" y="72" width="430" height="64" rx="32" fill="#84cc16"/>
  <text x="105" y="115" fill="#0f172a" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="1">{$escapedCategory}</text>
  <text x="84" y="430" fill="#ffffff" font-family="Arial, sans-serif" font-size="66" font-weight="800">{$escapedTitle}</text>
  <text x="92" y="520" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="30">{$descriptionTspans}</text>
  <line x1="84" y1="690" x2="1116" y2="690" stroke="#475569" stroke-width="2"/>
  <text x="84" y="760" fill="#84cc16" font-family="Arial, sans-serif" font-size="34" font-weight="800">Mercasto</text>
  <text x="84" y="810" fill="#94a3b8" font-family="Arial, sans-serif" font-size="25">Imagen ilustrativa · El vendedor no agregó fotografía</text>
</svg>
SVG;
    }

    private function categoryLabel(string $slug): string
    {
        return match (Str::lower($slug)) {
            'motor', 'autos', 'automotriz' => 'AUTOS Y MOTOR',
            'inmobiliaria', 'inmuebles' => 'INMUEBLES',
            'empleo' => 'EMPLEO',
            'servicios' => 'SERVICIOS',
            'electronica', 'electrónica' => 'ELECTRÓNICA',
            'moviles', 'móviles' => 'MÓVILES',
            'moda' => 'MODA',
            'hogar' => 'HOGAR',
            'deportes' => 'DEPORTES',
            'infantil' => 'INFANTIL',
            'mascotas' => 'MASCOTAS',
            default => Str::upper(str_replace(['-', '_'], ' ', $slug !== '' ? $slug : 'Clasificados')),
        };
    }

    private function plainText(string $value, int $limit): string
    {
        $decoded = json_decode($value, true);
        if (is_array($decoded)) {
            $value = (string) ($decoded['es'] ?? $decoded['en'] ?? reset($decoded) ?? '');
        }

        $value = trim(preg_replace('/\s+/u', ' ', strip_tags($value)) ?? '');

        return Str::limit($value, $limit, '…');
    }

    private function wrap(string $text, int $width, int $maxLines): array
    {
        if ($text === '') {
            return ['Consulta la descripción completa del anuncio.'];
        }

        $words = preg_split('/\s+/u', $text) ?: [];
        $lines = [];
        $line = '';

        foreach ($words as $word) {
            $candidate = trim($line . ' ' . $word);
            if (mb_strlen($candidate) <= $width) {
                $line = $candidate;
                continue;
            }

            if ($line !== '') {
                $lines[] = $line;
            }
            $line = $word;
            if (count($lines) >= $maxLines - 1) {
                break;
            }
        }

        if ($line !== '' && count($lines) < $maxLines) {
            $lines[] = $line;
        }

        return $lines;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
}
