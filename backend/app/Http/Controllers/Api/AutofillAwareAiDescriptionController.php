<?php

namespace App\Http\Controllers\Api;

use App\Services\AI\ListingAutofillGatewayClient;
use App\Services\LocalAiClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Throwable;

class AutofillAwareAiDescriptionController extends AiDescriptionController
{
    public function __construct(private ListingAutofillGatewayClient $autofill) {}

    public function __invoke(Request $request, LocalAiClient $ai): JsonResponse
    {
        if ($request->input('mode') !== 'listing_autofill') {
            return parent::__invoke($request, $ai);
        }

        $validated = $request->validate([
            'mode' => 'required|in:listing_autofill',
            'short_text' => 'nullable|string|max:1200',
            'locale' => 'nullable|string|max:10',
            'images' => 'nullable|array|max:2',
            'images.*' => 'image|mimes:jpeg,jpg,png,webp|max:4096',
        ]);
        $files = array_values(array_filter((array) $request->file('images', [])));
        $shortText = trim((string) ($validated['short_text'] ?? ''));
        if ($shortText === '' && $files === []) {
            return response()->json(['error' => 'Agrega una foto o una descripción breve.'], 422);
        }

        try {
            $taxonomy = $this->taxonomy();
            if ($taxonomy === []) {
                return response()->json(['error' => 'El catálogo de categorías no está disponible.'], 503);
            }
            $images = [];
            foreach (array_slice($files, 0, 2) as $file) {
                $bytes = $file->get();
                if (! is_string($bytes) || $bytes === '') {
                    continue;
                }
                $images[] = base64_encode($bytes);
            }
            $result = $this->autofill->suggest(
                $shortText,
                $images,
                $taxonomy,
                (string) ($validated['locale'] ?? 'es'),
            );

            return response()->json([
                'success' => true,
                'suggestions' => $result,
                'applied' => false,
            ]);
        } catch (Throwable $exception) {
            Log::warning('Private listing autofill unavailable.', [
                'user_id' => $request->user()?->id,
                'exception' => $exception::class,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Las sugerencias no están disponibles ahora. Puedes publicar manualmente.',
                'applied' => false,
            ], 503);
        }
    }

    private function taxonomy(): array
    {
        if (! Schema::hasTable('categories')) {
            return [];
        }

        $categories = DB::table('categories')
            ->orderBy('sort_order')
            ->limit(40)
            ->get(['id', 'slug', 'name']);
        $attributes = collect();
        if (Schema::hasTable('category_attributes')) {
            $attributes = DB::table('category_attributes')
                ->whereIn('category_id', $categories->pluck('id'))
                ->orderBy('sort_order')
                ->get(['category_id', 'key', 'type', 'options'])
                ->groupBy('category_id');
        }

        return $categories->map(function ($category) use ($attributes): array {
            $name = json_decode((string) $category->name, true);
            $label = is_array($name)
                ? (string) ($name['es'] ?? $name['en'] ?? reset($name) ?: $category->slug)
                : (string) ($category->name ?: $category->slug);
            $categoryAttributes = collect($attributes->get($category->id, []))
                ->take(60)
                ->map(fn ($attribute): array => [
                    'key' => (string) $attribute->key,
                    'type' => (string) $attribute->type,
                    'options' => $this->canonicalOptions($attribute->options),
                ])
                ->values()
                ->all();

            return [
                'slug' => (string) $category->slug,
                'label' => mb_substr($label, 0, 160),
                'attributes' => $categoryAttributes,
            ];
        })->values()->all();
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
        foreach (array_slice($raw, 0, 100) as $option) {
            if (is_scalar($option)) {
                $values[] = mb_substr(trim((string) $option), 0, 120);
                continue;
            }
            if (! is_array($option)) {
                continue;
            }
            $candidate = $option['value'] ?? $option['label'] ?? null;
            if (is_array($candidate)) {
                $candidate = $candidate['es'] ?? $candidate['en'] ?? reset($candidate);
            }
            if (is_scalar($candidate)) {
                $values[] = mb_substr(trim((string) $candidate), 0, 120);
            }
        }

        return array_values(array_unique(array_filter($values, fn (string $value): bool => $value !== '')));
    }
}
