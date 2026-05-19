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
                ->select('name', 'slug')
                ->get()
                ->map(fn ($category) => $this->localizedCategoryName($category->name, $category->slug))
                ->filter(fn ($title) => str_contains(mb_strtolower($title, 'UTF-8'), $normalizedQuery))
                ->take(3)
                ->values();

            return $ads->merge($categories)->unique()->take(8)->values();
        });

        return response()->json($suggestions);
    }

    private function localizedCategoryName($rawName, string $fallback): string
    {
        $decodedName = is_string($rawName) ? json_decode($rawName, true) : $rawName;

        if (is_array($decodedName)) {
            return (string) ($decodedName['es'] ?? $decodedName['en'] ?? reset($decodedName) ?: $fallback);
        }

        return (string) ($rawName ?: $fallback);
    }
}
