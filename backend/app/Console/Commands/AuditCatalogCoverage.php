<?php

namespace App\Console\Commands;

use App\Models\Ad;
use App\Models\Category;
use Illuminate\Console\Command;

class AuditCatalogCoverage extends Command
{
    private const AGGREGATE_CATEGORIES = [
        'productos' => ['electronica', 'hogar', 'moda', 'ocio', 'infantil', 'mascotas', 'formacion'],
    ];

    protected $signature = 'ads:audit-catalog-coverage {--minimum=4}';
    protected $description = 'Verify active category coverage and catalog-reference content quality.';

    public function handle(): int
    {
        $minimum = max(1, (int) $this->option('minimum'));
        $errors = [];
        $rows = [];
        foreach (Category::query()->orderBy('sort_order')->get(['slug']) as $category) {
            $coverageSlugs = self::AGGREGATE_CATEGORIES[$category->slug] ?? [$category->slug];
            $active = Ad::query()->whereIn('category', $coverageSlugs)->where('status', 'active')->count();
            $genuine = Ad::query()->whereIn('category', $coverageSlugs)->where('status', 'active')->where('is_catalog_filler', false)->count();
            $filler = Ad::query()->whereIn('category', $coverageSlugs)->where('status', 'active')->where('is_catalog_filler', true)->count();
            $rows[] = [$category->slug, $active, $genuine, $filler, $active >= $minimum ? 'ok' : 'LOW'];
            if ($active < $minimum) $errors[] = "{$category->slug}: only {$active} active listing(s)";
        }
        $this->table(['category','active','genuine','catalog refs','coverage'], $rows);

        $fillers = Ad::query()->where('is_catalog_filler', true)->where('status', 'active')->get();
        $seenImages = [];
        foreach ($fillers as $ad) {
            $images = is_array($ad->image_url) ? $ad->image_url : json_decode((string) $ad->image_url, true);
            $image = is_array($images) ? ($images[0] ?? '') : '';
            if (! is_string($image) || trim($image) === '') $errors[] = "filler #{$ad->id}: missing image";
            if (trim((string) $ad->description) === '' || mb_strlen(strip_tags((string) $ad->description)) < 60) $errors[] = "filler #{$ad->id}: weak description";
            if ((float) $ad->price <= 0) $errors[] = "filler #{$ad->id}: invalid price";
            if (trim((string) $ad->location) === '') $errors[] = "filler #{$ad->id}: missing location";
            if ($ad->ai_moderation_status !== 'approved') $errors[] = "filler #{$ad->id}: moderation not approved";
            if ($image !== '') {
                $normalized = preg_replace('/\?.*$/', '', $image) ?: $image;
                $attributes = is_array($ad->attributes) ? $ad->attributes : [];
                $semanticKey = trim((string) ($attributes['catalog_image_semantic_key'] ?? ''));
                $imageSource = trim((string) ($attributes['catalog_image_source'] ?? ''));
                if (isset($seenImages[$normalized])) {
                    $previous = $seenImages[$normalized];
                    $sameCuratedPool = $imageSource === 'curated-local'
                        && $previous['source'] === 'curated-local'
                        && $semanticKey !== ''
                        && $previous['semantic_key'] === $semanticKey;
                    if (! $sameCuratedPool) {
                        $errors[] = "duplicate filler image across incompatible pools: #{$previous['id']} and #{$ad->id}";
                    }
                }
                $seenImages[$normalized] = [
                    'id' => $ad->id,
                    'semantic_key' => $semanticKey,
                    'source' => $imageSource,
                ];
            }
        }

        if ($errors !== []) {
            foreach ($errors as $error) $this->error($error);
            return self::FAILURE;
        }
        $this->info('Catalog coverage audit passed.');
        return self::SUCCESS;
    }
}
