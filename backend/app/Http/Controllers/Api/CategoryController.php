<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index()
    {
        // Кэшируем список категорий на 24 часа (очень редко меняются)
        $categories = Cache::remember('categories_all', 86400, function () {
            return Category::orderBy('sort_order')->get()->toArray();
        });
        
        return response()->json($categories);
    }

    public function store(Request $request)
    {
        // Проверка прав: разрешаем создавать категории только администраторам
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещен. Только для администраторов.'], 403);
        }

        $request->validate([
            'slug' => 'required|string|unique:categories,slug|max:255',
            'name_es' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'icon' => 'required|string|max:50',
            'sort_order' => 'nullable|integer',
        ]);

        $category = Category::create([
            'slug' => $request->slug,
            'name' => ['es' => $request->name_es, 'en' => $request->name_en],
            'icon' => $request->icon,
            'sort_order' => $request->sort_order ?? 0,
        ]);
    
        Cache::forget('categories_all');

        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        // Проверка прав: разрешаем редактировать только администраторам
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Доступ запрещен. Только для администраторов.'], 403);
        }

        $category = Category::findOrFail($id);

        $request->validate([
            'slug' => 'required|string|max:255|unique:categories,slug,' . $category->id,
            'name_es' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'icon' => 'required|string|max:50',
            'sort_order' => 'nullable|integer',
        ]);

        $oldSlug = $category->slug;

        $category->update([
            'slug' => $request->slug,
            'name' => ['es' => $request->name_es, 'en' => $request->name_en],
            'icon' => $request->icon,
            'sort_order' => $request->sort_order ?? 0,
        ]);
        
        // Защита от Data Orphanization: если slug изменился, каскадно обновляем все объявления
        if ($oldSlug !== $request->slug) {
            \Illuminate\Support\Facades\DB::table('ads')->where('category', $oldSlug)->update(['category' => $request->slug]);
        }
    
        Cache::forget('categories_all');

        return response()->json($category);
    }
}
