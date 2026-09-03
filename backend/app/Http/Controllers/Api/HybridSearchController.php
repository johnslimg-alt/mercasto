<?php

namespace App\Http\Controllers\Api;

use App\Services\AI\HybridSearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HybridSearchController extends SearchController
{
    public function __construct(private HybridSearchService $hybridSearch)
    {
    }

    public function semanticSearch(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:100',
            'q' => 'nullable|string|max:100',
            'category' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'condition' => 'nullable',
            'page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = trim((string) ($data['search'] ?? ''));
        if ($query === '') {
            $query = trim((string) ($data['q'] ?? ''));
        }
        if (mb_strlen($query) < 2) {
            return response()->json(['data' => [], 'total' => 0]);
        }

        $conditions = $data['condition'] ?? [];
        if (is_string($conditions)) {
            $conditions = array_values(array_filter(array_map('trim', explode(',', $conditions))));
        }
        if (! is_array($conditions)) {
            $conditions = [];
        }

        $result = $this->hybridSearch->search($query, [
            'category' => trim((string) ($data['category'] ?? '')),
            'state' => trim((string) ($data['state'] ?? '')),
            'min_price' => $data['min_price'] ?? null,
            'max_price' => $data['max_price'] ?? null,
            'condition' => $conditions,
        ], (int) ($data['page'] ?? 1));

        $payload = $result['paginator']->toArray();
        $payload['discovery'] = [
            'mode' => $result['mode'],
            'exact_first' => true,
            'semantic_authoritative' => false,
            'semantic_enabled' => (bool) config('semantic_discovery.enabled', true),
        ];

        return response()->json($payload);
    }
}
