<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $definitions = DB::table('category_attributes')
            ->join('categories', 'categories.id', '=', 'category_attributes.category_id')
            ->select(
                'categories.id as category_id',
                'categories.slug as category_slug',
                'category_attributes.key',
                'category_attributes.options'
            )
            ->whereNotNull('category_attributes.options')
            ->get();

        foreach ($definitions as $definition) {
            $legacyToCanonical = $this->legacyToCanonicalMap($definition->options);
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
                        if (! is_array($attributes) || ! array_key_exists($definition->key, $attributes)) {
                            continue;
                        }

                        [$normalized, $changed] = $this->normalizeStoredValue(
                            $attributes[$definition->key],
                            $legacyToCanonical
                        );
                        if (! $changed) {
                            continue;
                        }

                        $attributes[$definition->key] = $normalized;
                        DB::table('ads')->where('id', $ad->id)->update([
                            'attributes' => json_encode($attributes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        ]);
                    }
                });

            if (! Schema::hasTable('search_alerts')) {
                continue;
            }

            DB::table('search_alerts')
                ->whereNotNull('filters')
                ->where(function ($query) use ($definition): void {
                    $query->where('category_slug', $definition->category_slug)
                        ->orWhere('category_id', $definition->category_id);
                })
                ->orderBy('id')
                ->chunkById(200, function ($alerts) use ($definition, $legacyToCanonical): void {
                    foreach ($alerts as $alert) {
                        $filters = is_string($alert->filters) ? json_decode($alert->filters, true) : $alert->filters;
                        if (! is_array($filters) || ! array_key_exists($definition->key, $filters)) {
                            continue;
                        }

                        [$normalized, $changed] = $this->normalizeStoredValue(
                            $filters[$definition->key],
                            $legacyToCanonical
                        );
                        if (! $changed) {
                            continue;
                        }

                        $filters[$definition->key] = $normalized;
                        DB::table('search_alerts')->where('id', $alert->id)->update([
                            'filters' => json_encode($filters, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        ]);
                    }
                });
        }
    }

    private function legacyToCanonicalMap(mixed $rawOptions): array
    {
        $options = is_string($rawOptions) ? json_decode($rawOptions, true) : $rawOptions;
        if (! is_array($options)) {
            return [];
        }

        $legacyToCanonical = [];
        foreach ($options as $option) {
            if (! is_array($option) || ! isset($option['value'])) {
                continue;
            }

            $canonical = trim((string) $option['value']);
            if ($canonical === '') {
                continue;
            }

            // Canonical values map to themselves so mixed legacy/canonical arrays
            // remain stable while translated display labels are upgraded.
            $legacyToCanonical[$this->lookupKey($canonical)] = $canonical;

            $labels = is_array($option['label'] ?? null)
                ? $option['label']
                : [$option['label'] ?? null];
            foreach ($labels as $displayLabel) {
                if (! is_scalar($displayLabel)) {
                    continue;
                }
                $legacyToCanonical[$this->lookupKey((string) $displayLabel)] = $canonical;
            }
        }

        return $legacyToCanonical;
    }

    private function normalizeStoredValue(mixed $value, array $legacyToCanonical): array
    {
        if (is_array($value)) {
            $changed = false;
            $normalized = [];
            foreach ($value as $key => $item) {
                [$normalizedItem, $itemChanged] = $this->normalizeStoredValue($item, $legacyToCanonical);
                $normalized[$key] = $normalizedItem;
                $changed = $changed || $itemChanged;
            }
            return [$normalized, $changed];
        }

        if (! is_scalar($value)) {
            return [$value, false];
        }

        $current = trim((string) $value);
        $canonical = $legacyToCanonical[$this->lookupKey($current)] ?? null;
        if ($canonical === null || $canonical === $current) {
            return [$value, false];
        }

        return [$canonical, true];
    }

    private function lookupKey(string $value): string
    {
        return mb_strtolower(trim($value), 'UTF-8');
    }

    public function down(): void
    {
        // Canonical values are the durable storage contract; restoring ambiguous
        // translated display labels would intentionally reintroduce invalid data.
    }
};
