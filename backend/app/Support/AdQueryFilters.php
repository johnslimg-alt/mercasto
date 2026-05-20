<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdQueryFilters
{
    private const MAX_STRING_LENGTH = 80;

    public static function apply(Builder $query, Request $request): void
    {
        self::applyGlobalFilters($query, $request);
        self::applyCategoryFilters($query, $request);
    }

    public static function hasAdvancedFilters(Request $request): bool
    {
        return $request->anyFilled([
            'price_min',
            'price_max',
            'published_days',
            'verified_only',
        ]) || $request->filled('filters');
    }

    private static function applyGlobalFilters(Builder $query, Request $request): void
    {
        $priceMin = self::numeric($request->query('price_min', $request->query('min_price')));
        if ($priceMin !== null) {
            $query->where('price', '>=', $priceMin);
        }

        $priceMax = self::numeric($request->query('price_max', $request->query('max_price')));
        if ($priceMax !== null) {
            $query->where('price', '<=', $priceMax);
        }

        $publishedDays = self::positiveInt($request->query('published_days'));
        if ($publishedDays !== null) {
            $publishedDays = min($publishedDays, (int) config('category_attributes.global_filters.published_days.max', 365));
            $query->where('ads.created_at', '>=', now()->subDays($publishedDays));
        }

        if ($request->boolean('verified_only')) {
            $query->whereHas('user', static function (Builder $userQuery): void {
                $userQuery->where('is_verified', true);
            });
        }
    }

    private static function applyCategoryFilters(Builder $query, Request $request): void
    {
        $filters = $request->query('filters');

        if (! is_array($filters) || $filters === []) {
            return;
        }

        $allowed = self::allowedFilterMap((string) $request->query('category', ''));

        foreach ($filters as $rawKey => $rawValue) {
            if (! is_string($rawKey)) {
                continue;
            }

            $normalized = self::normalizeKey($rawKey);
            $field = $allowed[$normalized] ?? null;

            if (! is_array($field)) {
                continue;
            }

            $attributeKey = (string) $field['key'];
            $filterType = (string) Arr::get($field, 'filter', 'exact');
            $valueType = (string) Arr::get($field, 'type', 'string');

            if ($filterType === 'range' && is_array($rawValue)) {
                self::applyRangeAttributeFilter($query, $attributeKey, $rawValue, $valueType);
                continue;
            }

            self::applyExactAttributeFilter($query, $attributeKey, $rawValue, $valueType);
        }
    }

    private static function applyRangeAttributeFilter(Builder $query, string $attributeKey, array $value, string $valueType): void
    {
        $min = self::numeric($value['min'] ?? null);
        $max = self::numeric($value['max'] ?? null);

        if ($min !== null) {
            $query->where("attributes->{$attributeKey}", '>=', $valueType === 'integer' ? (int) $min : $min);
        }

        if ($max !== null) {
            $query->where("attributes->{$attributeKey}", '<=', $valueType === 'integer' ? (int) $max : $max);
        }
    }

    private static function applyExactAttributeFilter(Builder $query, string $attributeKey, mixed $rawValue, string $valueType): void
    {
        if (is_array($rawValue)) {
            $values = collect($rawValue)
                ->map(fn (mixed $item): mixed => self::sanitizeValue($item, $valueType))
                ->filter(static fn (mixed $item): bool => $item !== null && $item !== '')
                ->unique()
                ->take(20)
                ->values()
                ->all();

            if ($values !== []) {
                $query->whereIn("attributes->{$attributeKey}", $values);
            }

            return;
        }

        $value = self::sanitizeValue($rawValue, $valueType);

        if ($value !== null && $value !== '') {
            $query->where("attributes->{$attributeKey}", $value);
        }
    }

    private static function allowedFilterMap(string $category): array
    {
        $databaseMap = self::databaseFilterMap($category);
        if ($databaseMap !== []) {
            return $databaseMap;
        }

        $verticals = (array) config('category_attributes.verticals', []);
        $map = [];

        foreach ($verticals as $vertical) {
            $categorySlugs = (array) Arr::get($vertical, 'category_slugs', []);

            if ($category !== '' && ! in_array($category, $categorySlugs, true)) {
                continue;
            }

            foreach ((array) Arr::get($vertical, 'attributes', []) as $key => $definition) {
                if (! is_array($definition)) {
                    continue;
                }

                $field = $definition;
                $field['key'] = $key;
                $map[self::normalizeKey((string) $key)] = $field;

                foreach ((array) Arr::get($definition, 'aliases', []) as $alias) {
                    $map[self::normalizeKey((string) $alias)] = $field;
                }
            }
        }

        return $map;
    }

    private static function databaseFilterMap(string $category): array
    {
        if ($category === '') {
            return [];
        }

        try {
            if (! Schema::hasTable('categories') || ! Schema::hasTable('category_attributes')) {
                return [];
            }

            return Cache::remember('ad_filter_map_' . sha1($category), 3600, static function () use ($category): array {
                return DB::table('category_attributes')
                    ->join('categories', 'categories.id', '=', 'category_attributes.category_id')
                    ->where('categories.slug', $category)
                    ->select('category_attributes.key', 'category_attributes.type')
                    ->get()
                    ->reduce(static function (array $map, object $attribute): array {
                        $key = (string) $attribute->key;
                        $dbType = (string) $attribute->type;

                        $field = [
                            'key' => $key,
                            'type' => $dbType === 'range' ? 'number' : ($dbType === 'boolean' ? 'boolean' : 'string'),
                            'filter' => $dbType === 'range' ? 'range' : 'exact',
                        ];

                        $map[self::normalizeKey($key)] = $field;

                        return $map;
                    }, []);
            });
        } catch (\Throwable) {
            return [];
        }
    }

    private static function sanitizeValue(mixed $value, string $type): mixed
    {
        if ($type === 'integer') {
            return self::positiveInt($value);
        }

        if ($type === 'number') {
            return self::numeric($value);
        }

        if (is_bool($value)) {
            return $value;
        }

        if (! is_scalar($value)) {
            return null;
        }

        return Str::of((string) $value)->trim()->limit(self::MAX_STRING_LENGTH, '')->toString();
    }

    private static function numeric(mixed $value): float|int|null
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (! is_numeric($value)) {
            return null;
        }

        return $value + 0;
    }

    private static function positiveInt(mixed $value): ?int
    {
        $number = self::numeric($value);

        if ($number === null) {
            return null;
        }

        $int = (int) $number;

        return $int > 0 ? $int : null;
    }

    private static function normalizeKey(string $key): string
    {
        return Str::of($key)
            ->lower()
            ->replace(['á', 'é', 'í', 'ó', 'ú', 'ñ'], ['a', 'e', 'i', 'o', 'u', 'n'])
            ->replaceMatches('/[^a-z0-9_]+/', '_')
            ->trim('_')
            ->toString();
    }
}
