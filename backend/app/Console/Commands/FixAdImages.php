<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Ad;
use Illuminate\Support\Facades\Cache;

class FixAdImages extends Command
{
    protected $signature = 'mercasto:fix-images';
    protected $description = 'Replace duplicate and broken mock ad images with unique, relevant Unsplash photos';

    public function handle()
    {
        $this->info('Starting image fix: unique, relevant photos per ad...');

        Cache::flush();
        $this->info('Redis cache flushed.');

        $ads = Ad::all();
        $updated = 0;

        foreach ($ads as $ad) {
            $query = $this->buildImageQuery($ad);
            $imgUrl = 'https://source.unsplash.com/600x400/?' . rawurlencode($query) . '&sig=' . $ad->id;

            $ad->image_url = json_encode([$imgUrl]);
            $ad->save();
            $updated++;
        }

        $this->info("Done! Updated {$updated} ads with unique relevant photos.");
    }

    private function buildImageQuery(Ad $ad): string
    {
        $title = $this->keywords($ad->title ?? '');

        $fallbacks = [
            'motor' => 'car vehicle mexico',
            'autos' => 'car vehicle mexico',
            'coches' => 'car vehicle mexico',
            'inmobiliaria' => 'house apartment real estate mexico',
            'servicios' => 'professional service tools mexico',
            'empleo' => 'office work laptop mexico',
            'electronica' => 'electronics gadget product',
            'tecnologia' => 'electronics gadget product',
            'telefonia' => 'smartphone phone product',
            'moda' => 'fashion clothes product',
            'hogar' => 'furniture home interior product',
            'mascotas' => 'pet animal product',
            'tiendas' => 'small business shop product',
        ];

        $category = strtolower((string) $ad->category);
        $base = $fallbacks[$category] ?? 'marketplace product mexico';

        return trim($title . ' ' . $base);
    }

    private function keywords(string $value): string
    {
        $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9\s-]/', ' ', $value);
        $value = preg_replace('/\s+/', ' ', $value);

        return trim(implode(' ', array_slice(explode(' ', trim($value)), 0, 5)));
    }
}
