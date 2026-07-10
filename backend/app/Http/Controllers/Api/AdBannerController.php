<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdBanner;
use App\Models\AdPlacement;
use App\Models\BannerImpression;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AdBannerController extends Controller
{
    /**
     * Todas las rutas de este controlador salvo publicBanners()/trackClick() son de
     * administración; no hay middleware de rol a nivel de ruta en este proyecto, así
     * que cada método admin valida aquí en lugar de confiar solo en el frontend.
     */
    private function ensureAdmin(Request $request)
    {
        if ($request->user()?->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        return null;
    }

    // ==================== ADMIN: BANNERS ====================

    /**
     * Список всех баннеров (admin)
     */
    public function index(Request $request)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $query = AdBanner::with(['placement', 'creator:id,name'])
            ->orderByDesc('priority')
            ->orderByDesc('created_at');

        if ($request->has('placement_id')) {
            $query->where('placement_id', $request->placement_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $banners = $query->paginate($request->get('per_page', 50));

        return response()->json($banners);
    }

    /**
     * Создание баннера (admin)
     */
    public function store(Request $request)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $validated = $request->validate([
            'placement_id' => 'required|exists:ad_placements,id',
            'title' => 'required|string|max:255',
            'image_url' => 'required|string',
            'link_url' => 'nullable|string|max:500',
            'alt_text' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'priority' => 'integer|min:0|max:100',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'target_categories' => 'nullable|array',
            'target_states' => 'nullable|array',
            'target_user_types' => 'nullable|array',
        ]);

        $validated['created_by'] = $request->user()->id;
        $validated['priority'] = $validated['priority'] ?? 0;
        $validated['is_active'] = $validated['is_active'] ?? true;

        $banner = AdBanner::create($validated);

        Log::info('Banner created', [
            'banner_id' => $banner->id,
            'title' => $banner->title,
            'admin_id' => $request->user()->id,
        ]);

        return response()->json($banner->load('placement', 'creator:id,name'), 201);
    }

    /**
     * Обновление баннера (admin)
     */
    public function update(Request $request, $id)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $banner = AdBanner::findOrFail($id);

        $validated = $request->validate([
            'placement_id' => 'exists:ad_placements,id',
            'title' => 'string|max:255',
            'image_url' => 'string',
            'link_url' => 'nullable|string|max:500',
            'alt_text' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'priority' => 'integer|min:0|max:100',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after:starts_at',
            'target_categories' => 'nullable|array',
            'target_states' => 'nullable|array',
            'target_user_types' => 'nullable|array',
        ]);

        $banner->update($validated);

        Log::info('Banner updated', [
            'banner_id' => $banner->id,
            'admin_id' => $request->user()->id,
        ]);

        return response()->json($banner->load('placement', 'creator:id,name'));
    }

    /**
     * Удаление баннера (admin)
     */
    public function destroy(Request $request, $id)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $banner = AdBanner::findOrFail($id);
        $banner->delete();

        Log::info('Banner deleted', [
            'banner_id' => $id,
            'admin_id' => $request->user()->id,
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Загрузка изображения баннера (admin)
     */
    public function uploadImage(Request $request)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // 5MB
        ]);

        $file = $request->file('image');
        $filename = 'banners/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        
        Storage::disk('public')->putFileAs('', $file, $filename);

        $url = Storage::disk('public')->url($filename);

        Log::info('Banner image uploaded', [
            'filename' => $filename,
            'admin_id' => $request->user()->id,
        ]);

        return response()->json([
            'url' => $url,
            'filename' => $filename,
        ]);
    }

    // ==================== ADMIN: PLACEMENTS ====================

    /**
     * Список рекламных мест (admin)
     */
    public function placements(Request $request)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $placements = AdPlacement::withCount('banners')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        // Добавляем статистику по каждому месту
        $placements->each(function ($placement) {
            $placement->active_banners_count = $placement->banners()
                ->where('is_active', true)
                ->count();
        });

        return response()->json($placements);
    }

    /**
     * Создание рекламного места (admin)
     */
    public function createPlacement(Request $request)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $validated = $request->validate([
            'slug' => 'required|string|max:100|unique:ad_placements,slug|regex:/^[a-z0-9_]+$/',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'position' => 'required|in:header,sidebar,footer,feed,between,search,category,listing',
            'width' => 'integer|min:100|max:2000',
            'height' => 'integer|min:30|max:1000',
            'max_banners' => 'integer|min:1|max:10',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $placement = AdPlacement::create($validated);

        Log::info('Placement created', [
            'placement_id' => $placement->id,
            'slug' => $placement->slug,
            'admin_id' => $request->user()->id,
        ]);

        return response()->json($placement, 201);
    }

    /**
     * Обновление рекламного места (admin)
     */
    public function updatePlacement(Request $request, $id)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $placement = AdPlacement::findOrFail($id);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'description' => 'nullable|string|max:500',
            'position' => 'in:header,sidebar,footer,feed,between,search,category,listing',
            'width' => 'integer|min:100|max:2000',
            'height' => 'integer|min:30|max:1000',
            'max_banners' => 'integer|min:1|max:10',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ]);

        $placement->update($validated);

        return response()->json($placement);
    }

    /**
     * Удаление рекламного места (admin)
     */
    public function destroyPlacement(Request $request, $id)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $placement = AdPlacement::findOrFail($id);

        // Проверяем что нет активных баннеров
        if ($placement->banners()->where('is_active', true)->exists()) {
            return response()->json([
                'error' => 'No se puede eliminar: hay banners activos en esta posición',
            ], 422);
        }

        $placement->delete();

        return response()->json(['ok' => true]);
    }

    // ==================== PUBLIC: BANNER DISPLAY ====================

    /**
     * Получить активные баннеры для места (public)
     */
    public function publicBanners(Request $request)
    {
        $validated = $request->validate([
            'placement' => 'required|string|exists:ad_placements,slug',
            'category' => 'nullable|string',
            'state' => 'nullable|string',
        ]);

        $placement = AdPlacement::where('slug', $validated['placement'])
            ->where('is_active', true)
            ->first();

        if (!$placement) {
            return response()->json(['banners' => []]);
        }

        $query = $placement->activeBanners()
            ->with('placement')
            ->limit($placement->max_banners);

        // Таргетинг по категории
        if (!empty($validated['category'])) {
            $query->forCategory($validated['category']);
        }

        // Таргетинг по штату
        if (!empty($validated['state'])) {
            $query->forState($validated['state']);
        }

        $banners = $query->get();

        // Трекинг показа (асинхронно, не блокируя ответ)
        foreach ($banners as $banner) {
            try {
                BannerImpression::create([
                    'banner_id' => $banner->id,
                    'user_id' => $request->user()?->id,
                    'ip_address' => $request->ip(),
                    'placement_slug' => $validated['placement'],
                    'category_slug' => $validated['category'] ?? null,
                    'state' => $validated['state'] ?? null,
                    'clicked' => false,
                    'user_agent' => substr($request->userAgent() ?? '', 0, 500),
                ]);

                $banner->incrementImpressions();
            } catch (\Throwable $e) {
                Log::warning('Banner impression tracking failed', [
                    'banner_id' => $banner->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'banners' => $banners->map(fn($b) => [
                'id' => $b->id,
                'title' => $b->title,
                'image_url' => $b->image_url,
                'link_url' => $b->link_url,
                'alt_text' => $b->alt_text ?? $b->title,
                'description' => $b->description,
            ]),
        ]);
    }

    /**
     * Трекинг клика по баннеру (public)
     */
    public function trackClick(Request $request, $id)
    {
        $banner = AdBanner::find($id);

        if (!$banner) {
            return response()->json(['error' => 'Banner not found'], 404);
        }

        // Обновляем последний impression для этого IP/юзера
        $impression = BannerImpression::where('banner_id', $id)
            ->where('ip_address', $request->ip())
            ->latest()
            ->first();

        if ($impression && !$impression->clicked) {
            $impression->update(['clicked' => true]);
        }

        $banner->incrementClicks();

        Log::info('Banner clicked', [
            'banner_id' => $id,
            'ip' => $request->ip(),
            'user_id' => $request->user()?->id,
        ]);

        return response()->json(['ok' => true, 'clicks' => $banner->clicks_count]);
    }

    /**
     * Статистика по баннерам (admin)
     */
    public function stats(Request $request)
    {
        if ($guard = $this->ensureAdmin($request)) return $guard;

        $stats = [
            'total_banners' => AdBanner::count(),
            'active_banners' => AdBanner::where('is_active', true)->count(),
            'total_impressions' => AdBanner::sum('impressions_count'),
            'total_clicks' => AdBanner::sum('clicks_count'),
            'avg_ctr' => AdBanner::where('impressions_count', '>', 0)->avg('ctr') ?? 0,
            'placements' => AdPlacement::count(),
            'active_placements' => AdPlacement::where('is_active', true)->count(),
            'top_banners' => AdBanner::with('placement')
                ->orderByDesc('clicks_count')
                ->limit(5)
                ->get(['id', 'title', 'impressions_count', 'clicks_count', 'ctr', 'placement_id']),
            'recent_impressions' => BannerImpression::count(),
        ];

        return response()->json($stats);
    }
}
