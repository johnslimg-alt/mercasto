<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $definitions = DB::table('category_attributes')
            ->join('categories', 'categories.id', '=', 'category_attributes.category_id')
            ->select('categories.slug as category_slug', 'category_attributes.key', 'category_attributes.options')
            ->whereNotNull('category_attributes.options')
            ->get();

        foreach ($definitions as $definition) {
            $options = is_string($definition->options)
                ? json_decode($definition->options, true)
                : $definition->options;
            if (! is_array($options)) {
                continue;
            }

            $legacyToCanonical = [];
            foreach ($options as $option) {
                if (! is_array($option) || ! isset($option['value'])) {
                    continue;
                }
                $canonical = trim((string) $option['value']);
                $labels = is_array($option['label'] ?? null)
                    ? $option['label']
                    : [$option['label'] ?? null];
                foreach ($labels as $displayLabel) {
                    if (! is_scalar($displayLabel)) {
                        continue;
                    }
                    $legacyToCanonical[mb_strtolower(trim((string) $displayLabel), 'UTF-8')] = $canonical;
                }
            }
            if ($legacyToCanonical === []) {
                continue;
            }

            DB::table('ads')
                ->where('category', $definition->category_slug)
                ->whereNotNull('attributes')
                ->orderBy('id')
                ->chunkById(200, function ($ads) use ($definition, $legacyToCanonical): void {
                    foreach ($ads as $ad) {
                        $attributes = is_string($ad->attributes) ? json_decode($ad->attributes, true) : $ad->attributes;
                        if (! is_array($attributes) || ! isset($attributes[$definition->key]) || ! is_scalar($attributes[$definition->key])) {
                            continue;
                        }
                        $current = trim((string) $attributes[$definition->key]);
                        $canonical = $legacyToCanonical[mb_strtolower($current, 'UTF-8')] ?? null;
                        if ($canonical === null || $canonical === $current) {
                            continue;
                        }
                        $attributes[$definition->key] = $canonical;
                        DB::table('ads')->where('id', $ad->id)->update([
                            'attributes' => json_encode($attributes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        ]);
                    }
                });
        }
    }

    public function down(): void
    {
        // Canonical values are the durable storage contract; restoring ambiguous
        // translated display labels would intentionally reintroduce invalid data.
    }
};
