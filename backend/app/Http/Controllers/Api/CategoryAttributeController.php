<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

        if (! Schema::hasTable('categories') || ! Schema::hasTable('category_attributes')) {
            return response()->json([]);
        }

        $cacheKey = "cat_attrs_v2_{$category}";

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

                    // Preserve canonical option values separately from display labels.
                    // The frontend already understands {value,label}; flattening these
                    // objects to labels makes filters query "Casa" while stored ads use
                    // canonical values such as "casa". Range metadata must also remain
                    // associative instead of being flattened into a list.
                    if (is_array($options) && ! isset($options['min'])) {
                        $formattedOptions = [];
                        foreach ($options as $opt) {
                            if (! is_array($opt)) {
                                $formattedOptions[] = $opt;
                                continue;
                            }

                            $value = $opt['value'] ?? null;
                            $optionLabel = $opt['label'] ?? $value;
                            if (is_array($optionLabel)) {
                                $optionLabel = $optionLabel['es'] ?? $optionLabel['en'] ?? reset($optionLabel);
                            }

                            if ($value !== null && $value !== '') {
                                $formattedOptions[] = [
                                    'value' => (string) $value,
                                    'label' => (string) ($optionLabel ?? $value),
                                ];
                            } else {
                                $fallback = reset($opt);
                                if (is_scalar($fallback)) {
                                    $formattedOptions[] = (string) $fallback;
                                }
                            }
                        }
                        $options = $formattedOptions;
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
        if ($dbType === 'number') return 'range';
        return 'select';
    }
}
