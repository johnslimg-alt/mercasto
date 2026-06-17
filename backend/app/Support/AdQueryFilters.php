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

    /** Полное название штата → аббревиатура, как она встречается в поле location ("Ciudad, ABBR"). */
    private const STATE_ABBR = [
        'Aguascalientes' => 'AGS', 'Baja California' => 'BC', 'Baja California Sur' => 'BCS',
        'Campeche' => 'CAMP', 'Chiapas' => 'CHIS', 'Chihuahua' => 'CHIH', 'Ciudad de México' => 'CDMX',
        'Coahuila' => 'COAH', 'Colima' => 'COL', 'Durango' => 'DGO', 'Estado de México' => 'MEX',
        'Guanajuato' => 'GTO', 'Guerrero' => 'GRO', 'Hidalgo' => 'HGO', 'Jalisco' => 'JAL',
        'Michoacán' => 'MICH', 'Morelos' => 'MOR', 'Nayarit' => 'NAY', 'Nuevo León' => 'NL',
        'Oaxaca' => 'OAX', 'Puebla' => 'PUE', 'Querétaro' => 'QRO', 'Quintana Roo' => 'ROO',
        'San Luis Potosí' => 'SLP', 'Sinaloa' => 'SIN', 'Sonora' => 'SON', 'Tabasco' => 'TAB',
        'Tamaulipas' => 'TAMS', 'Tlaxcala' => 'TLAX', 'Veracruz' => 'VER', 'Yucatán' => 'YUC',
        'Zacatecas' => 'ZAC',
    ];

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

        $filters = $request->query('filters');
        if (! is_array($filters)) {
            return;
        }

        $publishedDays = self::publishedDaysFromLabels(self::filterValues($filters, 'published_at'));
        if ($publishedDays !== null) {
            $query->where('ads.created_at', '>=', now()->subDays($publishedDays));
        }

        $sellerTypes = self::lowerValues(self::filterValues($filters, 'seller_type_global'));
        if ($sellerTypes !== []) {
            $query->whereHas('user', static function (Builder $userQuery) use ($sellerTypes): void {
                $userQuery->where(function (Builder $inner) use ($sellerTypes): void {
                    foreach ($sellerTypes as $index => $type) {
                        $method = $index === 0 ? 'where' : 'orWhere';
                        if (str_contains($type, 'tienda') || str_contains($type, 'distribuidor')) {
                            $inner->{$method}('role', 'business');
                        } elseif (str_contains($type, 'particular')) {
                            $inner->{$method}('role', 'individual');
                        } elseif (str_contains($type, 'verificado')) {
                            $inner->{$method}('is_verified', true);
                        }
                    }
                });
            });
        }

        $verification = self::lowerValues(self::filterValues($filters, 'seller_verified'));
        if ($verification !== []) {
            $query->whereHas('user', static function (Builder $userQuery) use ($verification): void {
                $userQuery->where(function (Builder $inner) use ($verification): void {
                    foreach ($verification as $index => $item) {
                        $method = $index === 0 ? 'where' : 'orWhere';
                        if (str_contains($item, 'vendedor') || str_contains($item, 'rese')) {
                            $inner->{$method}('is_verified', true);
                        } elseif (str_contains($item, 'tel')) {
                            $inner->{$method}('phone_verified', true);
                        }
                    }
                });
            });
        }

        $media = self::lowerValues(self::filterValues($filters, 'media'));
        foreach ($media as $item) {
            if (str_contains($item, 'foto')) {
                $query->whereNotNull('image_url')->where('image_url', '!=', '');
            } elseif (str_contains($item, 'video')) {
                $query->whereNotNull('video_url')->where('video_url', '!=', '');
            } elseif (str_contains($item, 'mapa') || str_contains($item, 'tour')) {
                $query->whereNotNull('latitude')->whereNotNull('longitude');
            }
        }

        // Локация из сайдбара: фронт шлёт filters[location_state] / filters[location_city].
        // Город/штат у объявлений лежат в полях location/state/city, поэтому матчим ILIKE по ним.
        $locationStates = self::filterValues($filters, 'location_state');
        if ($locationStates !== []) {
            $query->where(function (Builder $inner) use ($locationStates): void {
                foreach ($locationStates as $st) {
                    $name = trim((string) $st);
                    $like = '%' . $name . '%';
                    $inner->orWhereRaw('state ILIKE ?', [$like])
                          ->orWhereRaw('location ILIKE ?', [$like]);
                    // Часть объявлений хранит штат сокращением в location ("Guadalajara, JAL"),
                    // поэтому матчим и по аббревиатуре штата.
                    $abbr = self::STATE_ABBR[$name] ?? null;
                    if ($abbr) {
                        $inner->orWhereRaw('location ILIKE ?', ['%, ' . $abbr]);
                    }
                }
            });
        }

        $locationCities = self::filterValues($filters, 'location_city');
        if ($locationCities !== []) {
            $query->where(function (Builder $inner) use ($locationCities): void {
                foreach ($locationCities as $city) {
                    $like = '%' . trim((string) $city) . '%';
                    $inner->orWhereRaw('location ILIKE ?', [$like])
                          ->orWhereRaw('city ILIKE ?', [$like]);
                }
            });
        }

        // Тип объявления: атрибут listing_type у объявлений обычно не заполнен.
        // Матчим по атрибуту ИЛИ по тексту (title/description), а "Venta" считаем
        // значением по умолчанию для объявлений без явного типа (маркетплейс — преимущественно продажа).
        $listingTypes = self::filterValues($filters, 'listing_type');
        if ($listingTypes !== []) {
            $hasVenta = in_array('venta', self::lowerValues($listingTypes), true);
            $query->where(function (Builder $inner) use ($listingTypes, $hasVenta): void {
                $inner->whereIn('attributes->listing_type', $listingTypes);
                foreach ($listingTypes as $val) {
                    $like = '%' . trim((string) $val) . '%';
                    $inner->orWhereRaw('title ILIKE ?', [$like])
                          ->orWhereRaw('description ILIKE ?', [$like]);
                }
                if ($hasVenta) {
                    $inner->orWhereRaw("(attributes->>'listing_type') IS NULL");
                }
            });
        }

        foreach (['payment_method', 'delivery', 'seller_response'] as $key) {
            $values = self::filterValues($filters, $key);
            if ($values !== []) {
                self::applyExactAttributeFilter($query, $key, $values, 'string');
            }
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

    public static function sortFromFilter(Request $request): ?string
    {
        $filters = $request->query('filters');
        if (! is_array($filters)) {
            return null;
        }

        $value = self::filterValues($filters, 'sort')[0] ?? null;
        if (! is_string($value)) {
            return null;
        }

        $value = self::normalizeKey($value);

        return match (true) {
            str_contains($value, 'precio_menor') => 'price_asc',
            str_contains($value, 'precio_mayor') => 'price_desc',
            str_contains($value, 'popular') => 'popular',
            str_contains($value, 'reciente') => 'latest',
            default => null,
        };
    }

    private static function filterValues(array $filters, string $key): array
    {
        $value = $filters[$key] ?? null;

        if ($value === null || $value === '') {
            return [];
        }

        if (! is_array($value)) {
            $value = [$value];
        }

        return collect($value)
            ->map(fn (mixed $item): mixed => self::sanitizeValue($item, 'string'))
            ->filter(static fn (mixed $item): bool => is_string($item) && $item !== '')
            ->unique()
            ->take(20)
            ->values()
            ->all();
    }

    private static function lowerValues(array $values): array
    {
        return collect($values)
            ->map(fn (string $item): string => Str::of($item)->lower()->ascii()->toString())
            ->values()
            ->all();
    }

    private static function publishedDaysFromLabels(array $values): ?int
    {
        $days = null;

        foreach (self::lowerValues($values) as $value) {
            $candidate = match (true) {
                str_contains($value, 'hoy') => 1,
                str_contains($value, 'ayer') => 2,
                str_contains($value, '3') => 3,
                str_contains($value, 'semana') => 7,
                str_contains($value, 'mes') => 31,
                default => null,
            };

            if ($candidate !== null) {
                $days = $days === null ? $candidate : min($days, $candidate);
            }
        }

        return $days;
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
