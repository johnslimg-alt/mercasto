<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\SearchAlert;
use Illuminate\Http\Request;

class SearchAlertController extends Controller
{
    public function index(Request $request)
    {
        $alerts = SearchAlert::with('category:id,slug,name')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get();

        return response()->json($alerts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'nullable|string|max:120',
            'query' => 'nullable|string|max:120',
            'category' => 'nullable|string|max:120',
            'min_price' => 'nullable|numeric|min:0|max:999999999',
            'max_price' => 'nullable|numeric|min:0|max:999999999',
            'city' => 'nullable|string|max:120',
            'state' => 'nullable|string|max:120',
            'filters' => 'nullable|array',
        ]);

        $category = null;
        if (!empty($data['category'])) {
            $category = Category::where('slug', $data['category'])->first();
        }

        $name = trim($data['name'] ?? '') ?: $this->buildName($data);

        $alert = SearchAlert::create([
            'user_id' => $request->user()->id,
            'name' => $name,
            'query' => $data['query'] ?? null,
            'category_id' => $category?->id,
            'category_slug' => $data['category'] ?? null,
            'min_price' => $data['min_price'] ?? null,
            'max_price' => $data['max_price'] ?? null,
            'city' => $data['city'] ?? null,
            'state' => $data['state'] ?? null,
            'filters' => $data['filters'] ?? [],
            'is_active' => true,
        ]);

        return response()->json($alert->load('category:id,slug,name'), 201);
    }

    public function update(Request $request, SearchAlert $searchAlert)
    {
        $this->authorizeAlert($request, $searchAlert);

        $data = $request->validate([
            'name' => 'sometimes|string|max:120',
            'is_active' => 'sometimes|boolean',
        ]);

        $searchAlert->update($data);

        return response()->json($searchAlert->fresh('category:id,slug,name'));
    }

    public function destroy(Request $request, SearchAlert $searchAlert)
    {
        $this->authorizeAlert($request, $searchAlert);
        $searchAlert->delete();

        return response()->json(['message' => 'Alerta eliminada.']);
    }

    private function authorizeAlert(Request $request, SearchAlert $alert): void
    {
        abort_unless($alert->user_id === $request->user()->id, 403, 'No autorizado.');
    }

    private function buildName(array $data): string
    {
        $parts = array_filter([
            $data['query'] ?? null,
            $data['category'] ?? null,
            $data['city'] ?? $data['state'] ?? null,
        ]);

        return $parts ? implode(' · ', $parts) : 'Búsqueda guardada';
    }
}
