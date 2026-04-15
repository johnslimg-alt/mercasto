<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        // Возвращаем все категории, отсортированные по порядку (sort_order)
        return response()->json(Category::orderBy('sort_order')->get());
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

        $category->update([
            'slug' => $request->slug,
            'name' => ['es' => $request->name_es, 'en' => $request->name_en],
            'icon' => $request->icon,
            'sort_order' => $request->sort_order ?? 0,
        ]);

        return response()->json($category);
    }
}