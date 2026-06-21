<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedSearch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class SavedSearchController extends Controller
{
    /**
     * Get all saved searches for authenticated user
     */
    public function index(Request $request)
    {
        $searches = SavedSearch::forUser(Auth::id())
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $searches
        ]);
    }

    /**
     * Create a new saved search
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'filters' => 'required|array',
            'filters.query' => 'nullable|string|max:255',
            'filters.category' => 'nullable|string|max:100',
            'filters.state' => 'nullable|string|max:100',
            'filters.city' => 'nullable|string|max:100',
            'filters.min_price' => 'nullable|numeric|min:0',
            'filters.max_price' => 'nullable|numeric|min:0',
            'alerts_enabled' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Check limit (max 50 saved searches per user)
        $count = SavedSearch::forUser(Auth::id())->count();
        if ($count >= 50) {
            return response()->json([
                'message' => 'Has alcanzado el límite de 50 búsquedas guardadas'
            ], 429);
        }

        $search = SavedSearch::create([
            'user_id' => Auth::id(),
            'name' => $request->name,
            'filters' => $request->filters,
            'alerts_enabled' => $request->get('alerts_enabled', true),
        ]);

        return response()->json([
            'data' => $search,
            'message' => 'Búsqueda guardada exitosamente'
        ], 201);
    }

    /**
     * Update a saved search
     */
    public function update(Request $request, SavedSearch $savedSearch)
    {
        // Check ownership
        if ($savedSearch->user_id !== Auth::id()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'filters' => 'sometimes|array',
            'alerts_enabled' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $savedSearch->update($request->only(['name', 'filters', 'alerts_enabled']));

        return response()->json([
            'data' => $savedSearch,
            'message' => 'Búsqueda actualizada'
        ]);
    }

    /**
     * Delete a saved search
     */
    public function destroy(SavedSearch $savedSearch)
    {
        // Check ownership
        if ($savedSearch->user_id !== Auth::id()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $savedSearch->delete();

        return response()->json([
            'message' => 'Búsqueda eliminada'
        ]);
    }

    /**
     * Reset new results count
     */
    public function resetCount(SavedSearch $savedSearch)
    {
        if ($savedSearch->user_id !== Auth::id()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $savedSearch->resetNewResults();

        return response()->json([
            'data' => $savedSearch,
            'message' => 'Contador reiniciado'
        ]);
    }
}
