<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ListingAutofillTaxonomy
{
    public function schema(): array
    {
        if (! Schema::hasTable('categories')) {
            return ['categories' => [], 'subcategories' => [], 'attributes' => []];
        }

        $categories = DB::table('categories')
            ->orderBy('sort_order')
            ->get(['id', 'slug', 'name'])
            ->mapWithKeys(function ($row): array {
                $name = $this->localizedName($row->name);

                return [(string) $row->slug => [
                    'label' => $name,
                ]];
            })
            ->all();

        $subcategories = [];
        foreach ((array) config('listing_autofill.subcategories', []) as $category => $values) {
            if (isset($categories[$category])) {
                $subcategories[$category] = array_values(array_filter($values, 'is_string'));
            }
        }

        $attributes = [];
        if (Schema::hasTable('category_attributes')) {
            $rows = DB::table('category_attributes')
                ->join('categories', 'categories.id', '=', 'category_attributes.category_id')
                ->orderBy('category_attributes.sort_order')
                ->get([
                    'categories.slug as category_slug',
                    'category_attributes.key',
                    'category_attributes.type',
                    'category_attributes.options',
                ]);

            foreach ($rows as $row) {
                $category = (string) $row->category_slug;
                $key = (string) $row->key;
                if (! isset($categories[$category]) || ! preg_match('/^[a-zA-Z0-9_-]{1,80}$/', $key)) {
                    continue;
                }
                $attributes[$category][$key] = [
                    'type' => (string) $row->type,
                    'options' => $this->canonicalOptions($row->options),
                ];
            }
        }

        return compact('categories', 'subcategories', 'attributes');
    }

    public function sanitize(array $proposal, array $schema): array
    {
        $minimum = max(0.0, min(1.0, (float) config('listing_autofill.min_field_confidence', 0.55)));
        $category = $this->boundedField($proposal['category'] ?? null, array_keys($schema['categories'] ?? []), $minimum);
        $categoryValue = $category['value'] ?? null;

        $subcategory = null;
        $attributes = [];
        if (is_string($categoryValue)) {
            $subcategory = $this->boundedField(
                $proposal['subcategory'] ?? null,
                (array) ($schema['subcategories'][$categoryValue] ?? []),
                $minimum,
            );

            foreach ((array) ($proposal['attributes'] ?? []) as $key => $candidate) {
                if (! is_string($key) || ! isset($schema['attributes'][$categoryValue][$key])) {
                    continue;
                }
                $definition = $schema['attributes'][$categoryValue][$key];
                $field = $this->boundedField(
                    $candidate,
                    (array) ($definition['options'] ?? []),
                    $minimum,
                    allowFreeText: empty($definition['options']),
                );
                if ($field !== null) {
                    $attributes[$key] = $field;
                }
            }
        }

        return [
            'category' => $category,
            'subcategory' => $subcategory,
            'attributes' => $attributes,
            'title' => $this->boundedTextField($proposal['title'] ?? null, $minimum, 200),
            'description' => $this->boundedTextField($proposal['description'] ?? null, $minimum, 1200),
        ];
    }

    private function boundedField(mixed $candidate, array $allowed, float $minimum, bool $allowFreeText = false): ?array
    {
        if (! is_array($candidate) || ! is_string($candidate['value'] ?? null) || ! is_numeric($candidate['confidence'] ?? null)) {
            return null;
        }
        $value = trim($candidate['value']);
        $confidence = max(0.0, min(1.0, (float) $candidate['confidence']));
        if ($value === '' || $confidence < $minimum || mb_strlen($value) > 500) {
            return null;
        }
        if (! $allowFreeText && ! in_array($value, $allowed, true)) {
            return null;
        }

        return ['value' => $value, 'confidence' => round($confidence, 4)];
    }

    private function boundedTextField(mixed $candidate, float $minimum, int $maxLength): ?array
    {
        if (! is_array($candidate) || ! is_string($candidate['value'] ?? null) || ! is_numeric($candidate['confidence'] ?? null)) {
            return null;
        }
        $value = trim(strip_tags($candidate['value']));
        $confidence = max(0.0, min(1.0, (float) $candidate['confidence']));
        if ($value === '' || $confidence < $minimum) {
            return null;
        }

        return [
            'value' => mb_substr($value, 0, $maxLength),
            'confidence' => round($confidence, 4),
        ];
    }

    private function localizedName(mixed $raw): string
    {
        if (! is_string($raw)) {
            return '';
        }
        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return $raw;
        }

        return (string) ($decoded['es'] ?? $decoded['en'] ?? reset($decoded) ?? '');
    }

    private function canonicalOptions(mixed $raw): array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }
        if (! is_array($raw) || isset($raw['min'])) {
            return [];
        }

        $values = [];
        foreach ($raw as $option) {
            if (is_array($option)) {
                $value = $option['value'] ?? $option['label'] ?? null;
                if (is_array($value)) {
                    $value = $value['es'] ?? $value['en'] ?? reset($value);
                }
            } else {
                $value = $option;
            }
            if (is_scalar($value) && trim((string) $value) !== '') {
                $values[] = trim((string) $value);
            }
        }

        return array_values(array_unique($values));
    }
}
