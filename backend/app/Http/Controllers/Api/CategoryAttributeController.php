<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CategoryAttributeController extends Controller
{
    /**
     * Возвращает динамические атрибуты для указанной категории.
     * Используется в SidebarFilters (фильтрация) и PostScreen (создание объявления).
     *
     * GET /api/category-attributes?category=coches-y-motor
     */
    public function index(Request $request)
    {
        $category = trim((string) $request->query('category', ''));

        if ($category === '') {
            return response()->json([]);
        }

        $cacheKey = "cat_attrs_{$category}";

        $attributes = Cache::remember($cacheKey, 3600, function () use ($category) {
            return DB::table('category_attributes')
                ->join('categories', 'categories.id', '=', 'category_attributes.category_id')
                ->where('categories.slug', $category)
                ->orderBy('category_attributes.sort_order')
                ->select(
                    'category_attributes.id',
                    'category_attributes.key',
                    'category_attributes.label',
                    'category_attributes.type',
                    'category_attributes.options',
                    'category_attributes.required',
                    'category_attributes.sort_order'
                )
                ->get()
                ->map(function ($attr) {
                    // Декодируем label (JSON multilingual) и options
                    $label = $attr->label;
                    if ($decoded = json_decode($label, true)) {
                        $label = $decoded['es'] ?? $decoded['en'] ?? $label;
                    }

                    $options = $attr->options;
                    if (is_string($options)) {
                        $decoded = json_decode($options, true);
                        $options = $decoded ?? $options;
                    }

                    return [
                        'id'         => $attr->key,        // используем key как id для совместимости с filterConfig
                        'key'        => $attr->key,
                        'label'      => $label,
                        'type'       => $this->mapType($attr->type, $options),
                        'options'    => is_array($options) && !isset($options['min']) ? $options : null,
                        'range'      => is_array($options) && isset($options['min']) ? $options : null,
                        'required'   => (bool) $attr->required,
                        'sort_order' => (int) $attr->sort_order,
                    ];
                })
                ->values()
                ->all();
        });

        return response()->json($attributes);
    }

    /** Маппим тип из БД к типу filterConfig на фронтенде */
    private function mapType(string $dbType, mixed $options): string
    {
        if ($dbType === 'range') return 'range';
        if ($dbType === 'select') return 'select';
        if ($dbType === 'checkbox') return 'checkbox';
        if ($dbType === 'boolean') return 'checkbox';
        if ($dbType === 'text' || $dbType === 'input') return 'text';
        return 'select';
    }
}
