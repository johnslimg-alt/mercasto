<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class SearchController extends Controller
{
    public function suggestions(Request $request)
    {
        $data = $request->validate([
            'q' => 'nullable|string|max:80',
        ]);

        $q = trim($data['q'] ?? '');

        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $normalizedQuery = mb_strtolower($q, 'UTF-8');
        $cacheKey = 'suggestions:' . md5($normalizedQuery);

        $suggestions = Cache::remember($cacheKey, 300, function () use ($normalizedQuery) {
            $term = '%' . $normalizedQuery . '%';

            $ads = DB::table('ads')
                ->where('status', 'active')
                ->whereRaw('LOWER(title) LIKE ?', [$term])
                ->select('title')
                ->distinct()
                ->limit(6)
                ->pluck('title');

            $categories = DB::table('categories')
                ->whereRaw("LOWER(COALESCE(name->>'es', name->>'en', name::text)) LIKE ?", [$term])
                ->selectRaw("COALESCE(name->>'es', name->>'en') as title")
                ->limit(3)
                ->pluck('title');

            return $ads->merge($categories)->unique()->take(8)->values();
        });

        return response()->json($suggestions);
    }
}
