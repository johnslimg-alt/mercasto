<?php

namespace App\Console\Commands;

use App\Models\Ad;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class RepairCatalogFillers extends Command
{
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
            $this->comment('Preview only. Pass --apply to replace legacy filler images with unique local editorial covers and approve the editorial references.');
            return self::SUCCESS;
        }

        $updated = 0;
        $query->orderBy('id')->chunkById(200, function ($ads) use (&$updated): void {
            foreach ($ads as $ad) {
                $path = 'ads/catalog/reference-' . $ad->id . '.svg';
                if (! Storage::disk('public')->put($path, $this->coverSvg($ad))) {
                    throw new RuntimeException("Unable to write catalog cover for filler #{$ad->id}");
                }

                $attributes = is_array($ad->attributes) ? $ad->attributes : [];
                $attributes['editorial_reference'] = true;
                $attributes['catalog_cover_key'] = 'reference-' . $ad->id;

                $ad->forceFill([
                    'attributes' => $attributes,
                    'image_url' => json_encode([$path], JSON_UNESCAPED_SLASHES),
                    'generated_cover' => true,
                    'ai_moderation_status' => 'approved',
                    'ai_moderation_reason' => 'Referencia editorial de catálogo validada por Mercasto; no corresponde a una publicación de usuario.',
                    'ai_moderation_confidence' => 1,
                    'ai_moderated_at' => now(),
                    'expires_at' => null,
                    'reminder_sent_at' => null,
                ])->saveQuietly();

                $updated++;
            }
        });

        $this->info("Catalog filler repair complete: {$updated} active reference(s) normalized.");
        return self::SUCCESS;
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
