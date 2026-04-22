<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Events\NewNotification;
use App\Jobs\ProcessVideoWatermark;
use App\Mail\NewAdInCategory;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class AdController extends Controller
{
    /**
     * Получение списка всех активных объявлений
     */
    public function index(Request $request)
    {
        // Защита от убийства базы данных парсерами (Deep Pagination DoS)
        $page = (int) $request->query('page', 1);
        if ($page > 100) {
            return response()->json(['message' => 'Límite de paginación excedido para proteger la base de datos.'], 400);
        }

        // Защита приватности: убираем утечку whatsapp_clicks в публичной выдаче
        $query = Ad::with('user:id,name,role,avatar_url,is_verified,created_at');

        // Поиск по радиусу
        if ($request->filled('lat') && $request->filled('lng') && $request->filled('radius')) {
            $lat = (float) $request->lat;
            $lng = (float) $request->lng;
            $radius = (int) $request->radius;

            // Защита от краха MySQL (Haversine NaN Bug): GREATEST и LEAST предотвращают ошибку Out Of Range в обе стороны
            $haversine = "( 6371 * acos( greatest(-1.0, least(1.0, cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) ) )";

            $query->selectRaw("*, {$haversine} AS distance", [$lat, $lng, $lat])
                  ->where('status', 'active')
                  ->whereNotNull('latitude') // Искать только объявления с координатами
                  ->whereRaw("{$haversine} < ?", [$lat, $lng, $lat, $radius])
                  ->orderBy('distance');
        } else {
            $query->where('ads.status', 'active');
        }

        // Фильтрация по пользователю (для витрины Storefront)
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Фильтрация по категории
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
            $vectorSearchSuccess = false;

            if ($apiKey) {
                $response = Http::post("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={$apiKey}", [
                    'model' => 'models/text-embedding-004',
                    'content' => ['parts' => [['text' => $search]]]
                ]);
                if ($response->successful() && $embedding = $response->json('embedding.values')) {
                    $embeddingString = '[' . implode(',', $embedding) . ']';
                    $query->whereNotNull('embedding')->orderByRaw('embedding <=> ?', [$embeddingString]);
                    $vectorSearchSuccess = true;
                }
            }

            if (!$vectorSearchSuccess) {
                $query->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
        }

        // Фильтрация по локации
        if ($request->filled('location')) {
            $query->where('location', 'like', "%{$request->location}%");
        }
        
        // Глобальный фильтр: Цена
        if ($request->filled('min_price')) {
            $query->where('price', '>=', (float) $request->min_price);
        }
        if ($request->filled('max_price')) {
            $query->where('price', '<=', (float) $request->max_price);
        }

        // Глобальный фильтр: Состояние
        if ($request->filled('condition')) {
            $conditions = is_array($request->condition) ? $request->condition : explode(',', $request->condition);
            $query->whereIn('condition', $conditions);
        }

        // Динамические фильтры категорий (JSON Attributes - 600+ параметров)
        if ($request->filled('filters') && is_array($request->filters)) {
            foreach ($request->filters as $key => $value) {
                if (is_array($value)) {
                    $query->whereIn("attributes->{$key}", $value);
                } else {
                    $query->where("attributes->{$key}", $value);
                }
            }
        }

        // Сортировка (Спецификация: по дате, цене, популярности)
        $sort = $request->query('sort', 'latest');
        if ($sort === 'price_asc') { $query->orderBy('price', 'asc'); } 
        elseif ($sort === 'price_desc') { $query->orderBy('price', 'desc'); } 
        elseif ($sort === 'popular') { $query->orderBy('views', 'desc'); } 
        elseif ($sort === 'latest' && !$request->filled('radius')) { $query->latest(); }
        
        // Кэшируем главную страницу (без фильтров) на 60 секунд в Redis, чтобы выдерживать DDoS
        // Защита от Cache Bypass: проверяем только реальные параметры фильтрации, игнорируя мусорные
        $hasFilters = $request->anyFilled([
            'lat',
            'lng',
            'radius',
            'user_id',
            'category',
            'search',
            'location',
            'min_price',
            'max_price',
            'condition',
            'sort',
        ]) || $request->filled('filters');
        $isDefaultQuery = !$hasFilters;
        
        // Защита от Infinite Cache Bomb (DDoS Redis): кэшируем только первые 10 страниц
        if ($isDefaultQuery && $page <= 10) {
            $cacheKey = "ads_index_page_{$page}";
            
            return response()->json(Cache::remember($cacheKey, 60, function () use ($query) {
                return $query->paginate(16)->toArray();
            }));
        }
            
        $ads = $query->paginate(16); // Возвращаем по 16 объявлений на страницу
            
        return response()->json($ads);
    }

    /**
     * Получение одного объявления (Для прямых ссылок, SEO и Push-уведомлений)
     */
    public function show(Request $request, $id)
    {
        $ad = Ad::with('user:id,name,role,avatar_url,is_verified,created_at')->findOrFail($id);
        
        // Защита от IDOR: скрытые объявления могут видеть только их авторы или администраторы
        if ($ad->status !== 'active') {
            $user = auth('sanctum')->user(); // Маршрут публичный, поэтому проверяем токен вручную
            if (!$user || ($user->id !== $ad->user_id && $user->role !== 'admin')) {
                return response()->json(['message' => 'Anuncio no disponible o en revisión'], 403);
            }
        }

        // Защита приватности: скрываем аналитику (клики) от посторонних глаз
        $user = auth('sanctum')->user();
        if ($user && ($user->id === $ad->user_id || $user->role === 'admin')) {
            $ad->whatsapp_clicks = DB::table('ad_clicks')
                ->where('ad_id', $ad->id)
                ->where('channel', 'whatsapp')
                ->count();
        } else {
            $ad->whatsapp_clicks = null; // Скрываем от публики
        }
            
        return response()->json($ad);
    }

    /**
     * Сохранение нового объявления
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'required|string',
            'location' => 'nullable|string|max:255',
            'category' => 'required|string|exists:categories,slug', // Строгая привязка к БД, защита от Data Integrity Bypass
            'images' => 'nullable|array|max:10', // Максимум 10 картинок
            'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096', // Максимум 5МБ и защита от OOM-бомб (Pixel Flooding)
            'condition' => 'nullable|in:nuevo,usado',
            'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200', // 50MB Max
            'attributes' => 'nullable|array', // Динамические характеристики (марка, модель, ОЗУ и т.д.)
        ]);

        // Защита бизнес-модели: Проверка лимитов на количество объявлений (Free = 3, PRO = 100)
        $user = $request->user();
        $monthlyAds = Ad::where('user_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count();
        $maxAds = $user->role === 'business' ? 100 : 3;
        if ($monthlyAds >= $maxAds && $user->role !== 'admin') {
            return response()->json(['message' => "Has alcanzado el límite de {$maxAds} anuncios mensuales para tu tipo de cuenta. Sube a PRO para más."], 403);
        }

        $lat = null;
        $lng = null;
        if ($request->filled('location')) {
            $apiKey = config('services.google.maps_api_key');
            if ($apiKey) {
                $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                    'address' => $request->location,
                    'key' => $apiKey,
                ]);
                if ($response->successful() && !empty($response->json('results'))) {
                    $geometry = $response->json('results.0.geometry.location');
                    $lat = $geometry['lat'];
                    $lng = $geometry['lng'];
                }
            }
        }

        $imagePaths = [];
        if ($request->hasFile('images')) {
            // Оптимизация памяти (OOM): выносим загрузку водяного знака за пределы цикла
            $watermarkPath = storage_path('app/public/logo-watermark.png');
            $hasWatermark = file_exists($watermarkPath);
            $watermark = $hasWatermark ? Image::make($watermarkPath) : null;

            foreach ($request->file('images') as $image) {
                // Generate a unique name and convert to WebP
                $filename = Str::uuid() . '.webp';
                $path = 'ads/' . $filename;

                $img = Image::make($image)->orientate();
                
                // Защита от OOM (Out Of Memory) при загрузке огромных фото со смартфонов.
                // Уменьшаем изображение до разумных 1200px перед наложением водяного знака.
                $img->resize(1200, 1200, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });

                // Наложение водяного знака (логотипа)
                if ($watermark) {
                    $wm = clone $watermark;
                    // Масштабируем водяной знак до 15% ширины
                    $wm->resize($img->width() * 0.15, null, function ($constraint) {
                        $constraint->aspectRatio();
                    });
                    // Добавляем отступы в 20px от краев
                    $img->insert($wm, 'bottom-right', 20, 20);
                    $wm->destroy(); // Очищаем память клона
                }
                Storage::disk('public')->put($path, (string) $img->encode('webp', 85)); // Поддержка AWS S3
                $imagePaths[] = $path;
                
                $img->destroy(); // FIX MEMORY LEAK: Очищаем RAM после каждого фото
            }
            if ($watermark) $watermark->destroy();
        }

        $videoPath = null;
        $videoProcessingStatus = null;
        if ($request->hasFile('video_file')) {
            $videoPath = $request->file('video_file')->store('videos/originals', 'public');
            $videoProcessingStatus = 'pending';
        }

        $ad = Ad::create([
            'user_id' => $request->user()->id, // ID авторизованного пользователя
            'title' => $request->title,
            'price' => $request->price,
            'condition' => $request->input('condition', 'usado'),
            'description' => $request->description,
            'location' => $request->location,
            'latitude' => $lat,
            'longitude' => $lng,
            'category' => $request->category,
            'attributes' => $request->filled('attributes') ? json_encode($request->attributes) : null,
            'image_url' => count($imagePaths) > 0 ? json_encode($imagePaths) : null,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
            'status' => 'pending', // Отправляем на модерацию
        ]);

        // Если видео было загружено, отправляем его в очередь на обработку
        if ($videoPath) {
            ProcessVideoWatermark::dispatch($ad);
        }

        // --- AI СИСТЕМА: СЕМАНТИЧЕСКИЙ ПОИСК (EMBEDDINGS) И АВТО-МОДЕРАЦИЯ ---
        dispatch(function () use ($ad) {
            $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
            if (!$apiKey) return;
            
            // 1. Генерация Вектора (Embedding) для Умного Поиска
            $textContent = "{$ad->title} {$ad->category} {$ad->description}";
            $embedRes = Http::post("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={$apiKey}", [
                'model' => 'models/text-embedding-004',
                'content' => ['parts' => [['text' => $textContent]]]
            ]);
            if ($embedRes->successful() && $embedding = $embedRes->json('embedding.values')) {
                $embeddingString = '[' . implode(',', $embedding) . ']';
                DB::statement('UPDATE ads SET embedding = ?::vector WHERE id = ?', [$embeddingString, $ad->id]);
            }

            // 2. ИИ Авто-Модерация Контента (Анализ фото и текста)
            if ($ad->status === 'pending') {
                $images = json_decode($ad->image_url, true) ?? [];
                $parts = [['text' => "Act as a marketplace moderator. Analyze this ad. Title: '{$ad->title}'. Description: '{$ad->description}'. Return JSON ONLY: {\"status\": \"approved\"|\"rejected\", \"reason\": \"why\"}. Reject if it contains NSFW, weapons, drugs, scams, or inappropriate images. Approve otherwise."]];
                
                foreach (array_slice($images, 0, 2) as $img) {
                    $path = Storage::disk('public')->path($img);
                    if (file_exists($path)) {
                        $parts[] = ['inline_data' => ['mime_type' => mime_content_type($path), 'data' => base64_encode(file_get_contents($path))]];
                    }
                }
                
                $modRes = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
                    'contents' => [['parts' => $parts]]
                ]);
                
                if ($modRes->successful() && preg_match('/\{.*\}/s', $modRes->json('candidates.0.content.parts.0.text'), $matches)) {
                    $data = json_decode($matches[0], true);
                    if (isset($data['status'])) {
                        $newStatus = $data['status'] === 'approved' ? 'active' : 'rejected';
                        DB::table('ads')->where('id', $ad->id)->update(['status' => $newStatus]);
                    }
                }
            }
        });

        $ad->load('user');
        $ad->whatsapp_clicks = DB::table('ad_clicks')
            ->where('ad_id', $ad->id)
            ->where('channel', 'whatsapp')
            ->count();
            
        // Сбрасываем кэш, чтобы новое объявление сразу появилось на главной странице и в SEO-картах
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        // Подгружаем пользователя, чтобы вернуть полные данные для фронтенда
        return response()->json($ad, 201);
    }

    /**
     * Обновление указанного объявления в хранилище.
     */
    public function update(Request $request, Ad $ad)
    {
        // 1. Авторизация
        if ($request->user()->id !== $ad->user_id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Нет прав для редактирования этого объявления'], 403);
        }

        // 2. Валидация
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'required|string',
            'location' => 'nullable|string|max:255',
            'category' => 'required|string|exists:categories,slug', // Строгая привязка к БД
            'existing_images' => 'nullable|array',
            'existing_images.*' => 'string',
            'images' => 'nullable|array|max:10', // Новые изображения
            'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096', // Защита от Pixel Flooding
            'condition' => 'nullable|in:nuevo,usado',
            'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200', // Защита от загрузки вредоносных скриптов
            'attributes' => 'nullable|array',
        ]);

        $lat = $ad->latitude;
        $lng = $ad->longitude;
        // Пересчитываем координаты, только если локация изменилась
        if ($request->filled('location') && $request->location !== $ad->location) {
            $apiKey = config('services.google.maps_api_key');
            if ($apiKey) {
                $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                    'address' => $request->location,
                    'key' => $apiKey,
                ]);
                if ($response->successful() && !empty($response->json('results'))) {
                    $geometry = $response->json('results.0.geometry.location');
                    $lat = $geometry['lat'];
                    $lng = $geometry['lng'];
                }
            }
        }

        // 3. Обработка изображений
        $currentImages = json_decode($ad->image_url, true) ?? [];
        // Санитизация: строгая защита от SSRF/XSS при подмене изображений
        $requestedImages = array_filter($request->input('existing_images', []), function($img) {
            return is_string($img) && str_starts_with($img, 'ads/');
        });
        // Защита от IDOR (Кража медиа): разрешаем оставить только те фото, которые уже принадлежали этому объявлению
        $keptImages = array_intersect($currentImages, $requestedImages);

        // Находим изображения для удаления, сравнивая текущие с сохраненными
        $imagesToDelete = array_diff($currentImages, $keptImages);
        if (count($imagesToDelete) > 0) {
            Storage::disk('public')->delete($imagesToDelete);
        }

        // Защита от переполнения хранилища: проверяем ОБЩЕЕ количество картинок (старые + новые)
        if (count($keptImages) + ($request->hasFile('images') ? count($request->file('images')) : 0) > 10) {
            return response()->json(['message' => 'No puedes tener más de 10 imágenes en total por anuncio.'], 422);
        }

        // Загружаем новые изображения
        $newImagePaths = [];
        if ($request->hasFile('images')) {
            // Оптимизация памяти (OOM): выносим загрузку водяного знака за пределы цикла
            $watermarkPath = storage_path('app/public/logo-watermark.png');
            $hasWatermark = file_exists($watermarkPath);
            $watermark = $hasWatermark ? Image::make($watermarkPath) : null;

            foreach ($request->file('images') as $image) {
                // Generate a unique name and convert to WebP
                $filename = Str::uuid() . '.webp';
                $path = 'ads/' . $filename;
                
                $img = Image::make($image)->orientate();
                
                // Защита от OOM (Out Of Memory) при загрузке огромных фото со смартфонов.
                // Уменьшаем изображение до разумных 1200px перед наложением водяного знака.
                $img->resize(1200, 1200, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });

                // Наложение водяного знака (логотипа)
                if ($watermark) {
                    $wm = clone $watermark;
                    // Масштабируем водяной знак до 15%
                    $wm->resize($img->width() * 0.15, null, function ($constraint) {
                        $constraint->aspectRatio();
                    });
                    // Добавляем отступы в 20px от краев
                    $img->insert($wm, 'bottom-right', 20, 20);
                    $wm->destroy();
                }

                Storage::disk('public')->put($path, (string) $img->encode('webp', 85)); // Поддержка AWS S3
                $newImagePaths[] = $path;
                $img->destroy(); // FIX MEMORY LEAK
            }
            if ($watermark) $watermark->destroy();
        }

        // Объединяем сохраненные и новые изображения
        $finalImagePaths = array_merge($keptImages, $newImagePaths);

        $videoPath = $ad->video_url;
        $videoProcessingStatus = $ad->video_processing_status;
        if ($request->hasFile('video_file')) {
            // Удаляем старое видео, если оно есть
            if ($ad->video_url) {
                Storage::disk('public')->delete($ad->video_url);
            }
            $videoPath = $request->file('video_file')->store('videos/originals', 'public');
            $videoProcessingStatus = 'pending';
        } elseif ($request->boolean('remove_video')) {
            // Позволяем пользователю корректно удалять видео из хранилища AWS S3
            if ($ad->video_url) { Storage::disk('public')->delete($ad->video_url); }
            $videoPath = null;
            $videoProcessingStatus = null;
        }

        // Защита от Bait-and-Switch (Обход модерации): отправляем на перемодерацию при критичных изменениях контента
        $needsReModeration = false;
        if (in_array($ad->status, ['active', 'rejected'])) {
            // Защита от Permanent Rejection Soft-Lock: если объявление было отклонено, ЛЮБОЕ редактирование отправляет его на повторную проверку
            if ($ad->status === 'rejected' || $ad->title !== $validated['title'] || $ad->description !== $validated['description'] || $request->hasFile('images') || count($imagesToDelete) > 0 || $request->hasFile('video_file') || $request->boolean('remove_video')) {
                $needsReModeration = true;
            }
        }

        // 4. Обновляем объявление
        $ad->update([
            'title' => $validated['title'],
            'price' => $validated['price'],
            'condition' => $validated['condition'] ?? $ad->condition,
            'description' => $validated['description'],
            'location' => $validated['location'],
            'latitude' => $lat,
            'longitude' => $lng,
            'category' => $validated['category'],
            'attributes' => $request->filled('attributes') ? json_encode($request->attributes) : $ad->attributes,
            'image_url' => count($finalImagePaths) > 0 ? json_encode($finalImagePaths) : null,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
            'status' => $needsReModeration ? 'pending' : $ad->status, // Сбрасываем статус, если были критичные изменения
        ]);

        // Если было загружено новое видео, отправляем его в очередь на обработку
        if ($request->hasFile('video_file')) {
            ProcessVideoWatermark::dispatch($ad->fresh());
        }

        // --- AI СИСТЕМА: ОБНОВЛЕНИЕ ВЕКТОРА И ПОВТОРНАЯ МОДЕРАЦИЯ ---
        dispatch(function () use ($ad) {
            $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
            if (!$apiKey) return;
            
            $textContent = "{$ad->title} {$ad->category} {$ad->description}";
            $embedRes = Http::post("https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={$apiKey}", [
                'model' => 'models/text-embedding-004',
                'content' => ['parts' => [['text' => $textContent]]]
            ]);
            if ($embedRes->successful() && $embedding = $embedRes->json('embedding.values')) {
                $embeddingString = '[' . implode(',', $embedding) . ']';
                DB::statement('UPDATE ads SET embedding = ?::vector WHERE id = ?', [$embeddingString, $ad->id]);
            }

            if ($ad->status === 'pending') {
                $images = json_decode($ad->image_url, true) ?? [];
                $parts = [['text' => "Act as a marketplace moderator. Analyze this ad. Title: '{$ad->title}'. Description: '{$ad->description}'. Return JSON ONLY: {\"status\": \"approved\"|\"rejected\", \"reason\": \"why\"}. Reject if it contains NSFW, weapons, drugs, scams, or inappropriate images. Approve otherwise."]];
                
                foreach (array_slice($images, 0, 2) as $img) {
                    $path = Storage::disk('public')->path($img);
                    if (file_exists($path)) {
                        $parts[] = ['inline_data' => ['mime_type' => mime_content_type($path), 'data' => base64_encode(file_get_contents($path))]];
                    }
                }
                
                $modRes = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
                    'contents' => [['parts' => $parts]]
                ]);
                
                if ($modRes->successful() && preg_match('/\{.*\}/s', $modRes->json('candidates.0.content.parts.0.text'), $matches)) {
                    $data = json_decode($matches[0], true);
                    if (isset($data['status'])) {
                        $newStatus = $data['status'] === 'approved' ? 'active' : 'rejected';
                        DB::table('ads')->where('id', $ad->id)->update(['status' => $newStatus]);
                    }
                }
            }
        });

        // 5. Возвращаем ответ
        $ad->load('user');
        $ad->whatsapp_clicks = DB::table('ad_clicks')
            ->where('ad_id', $ad->id)
            ->where('channel', 'whatsapp')
            ->count();
            
        // Сбрасываем кэш SEO и главной страницы, чтобы изменения отразились мгновенно
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }
        
        return response()->json($ad);
    }

    /**
     * Изменение статуса объявления (Архивация/Активация)
     */
    public function updateStatus(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        if ($request->user()->id !== $ad->user_id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Нет прав для изменения статуса'], 403);
        }

        $request->validate(['status' => 'required|in:active,inactive,archived,pending']);
        
        // Защита от обхода модерации: только админ может активировать объявление со статусом pending/rejected
        if ($request->status === 'active' && in_array($ad->status, ['pending', 'rejected']) && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'No puedes activar un anuncio en revisión o rechazado.'], 403);
        }
        
        // Защита от спама: уведомляем подписчиков только при ПЕРВИЧНОЙ публикации (из pending в active), а не при каждом снятии с паузы
        if ($request->status === 'active' && $ad->status === 'pending') {
            $notificationData = [
                'user_id' => $ad->user_id,
                'title' => '¡Anuncio aprobado!',
                'message' => 'Tu anuncio "' . $ad->title . '" ha sido revisado y ya está visible en la plataforma.',
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $id = DB::table('user_notifications')->insertGetId($notificationData);
            $notificationData['id'] = $id;

            // Broadcast the event
            broadcast(new NewNotification($notificationData))->toOthers();

            // Send Web Push Notification
            $pushSubscribers = DB::table('push_subscriptions')->where('user_id', $ad->user_id)->get();
            if ($pushSubscribers->count() > 0 && config('services.webpush.vapid_public_key')) {
                // Асинхронная отправка Push-уведомлений, чтобы админ-панель не "зависала" при долгом ответе серверов Google/Apple
                dispatch(function () use ($pushSubscribers, $ad) {
                    $auth = [
                        'VAPID' => [
                            'subject' => 'mailto:hello@mercasto.com',
                            'publicKey' => config('services.webpush.vapid_public_key'),
                            'privateKey' => config('services.webpush.vapid_private_key'),
                        ],
                    ];
                    $webPush = new WebPush($auth);
                    $payload = json_encode(['title' => '¡Anuncio aprobado!', 'body' => 'Tu anuncio "' . $ad->title . '" ya está visible.', 'url' => '/?ad=' . $ad->id]);
                    foreach ($pushSubscribers as $sub) {
                        $webPush->queueNotification(
                            Subscription::create([
                                'endpoint' => $sub->endpoint,
                                'publicKey' => $sub->public_key,
                                'authToken' => $sub->auth_token,
                            ]), $payload
                        );
                    }
                    $webPush->flush();
                });
            }

            // Email subscriptions logic
            // Защита от OOM (Out Of Memory): отправляем письма порциями по 100 штук (Chunking)
            User::whereIn('id', function($query) use ($ad) {
                $query->select('user_id')->from('category_subscriptions')->where('category_slug', $ad->category);
            })->where('id', '!=', $ad->user_id)->chunk(100, function ($subscribers) use ($ad) {
                foreach ($subscribers as $subscriber) {
                    $prefs = is_string($subscriber->notification_preferences) ? json_decode($subscriber->notification_preferences, true) : ($subscriber->notification_preferences ?? ['email_alerts' => true]);
                    if ($prefs['email_alerts'] ?? true) {
                         Mail::to($subscriber)->queue(new NewAdInCategory($ad));
                    }
                }
            });
        }
        
        $ad->status = $request->status;
        $ad->save();
        
        // Сбрасываем кэш SEO и главной страницы
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        return response()->json(['success' => true, 'status' => $ad->status]);
    }

    /**
     * Продвижение объявления с использованием кредитов пользователя
     */
    public function promoteWithCredits(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);
        $user = $request->user();

        if ($user->id !== $ad->user_id && $user->role !== 'admin') {
            return response()->json(['message' => 'Нет прав'], 403);
        }

        // Защита баланса: предотвращаем повторное списание кредитов за уже продвинутое объявление
        if ($ad->promoted === 'destacado') {
            return response()->json(['message' => 'Este anuncio ya se encuentra destacado.'], 400);
        }

        $cost = 50; // Стоимость продвижения в кредитах
        
        // Атомарное списание для предотвращения ухода в минус при параллельных DdoS запросах
        $updated = DB::table('users')
            ->where('id', $user->id)
            ->where('balance', '>=', $cost)
            ->decrement('balance', $cost);
            
        if (!$updated) {
            return response()->json(['message' => 'No tienes suficientes créditos'], 400);
        }
        
        $ad->promoted = 'destacado';
        $ad->save();
        
        // Финансовый Аудит (Recurring Revenue): ограничиваем услугу 7 днями, чтобы продавец платил снова
        DB::table('ad_promotions')->insert([
            'ad_id' => $ad->id,
            'type' => 'highlight',
            'expires_at' => now()->addDays(7),
            'created_at' => now(),
            'updated_at' => now()
        ]);
        
        $newBalance = DB::table('users')->where('id', $user->id)->value('balance');
        return response()->json(['success' => true, 'balance' => $newBalance]);
    }

    /**
     * Удаление объявления
     */
    public function destroy(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        // Проверяем, что объявление удаляет его владелец (или администратор)
        if ($request->user()->id !== $ad->user_id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Нет прав для удаления этого объявления'], 403);
        }

        // Защита от "бессмертных" объявлений: игнорируем сбои AWS S3, чтобы объявление удалилось из БД в любом случае
        try {
            if ($ad->image_url) {
                $images = json_decode($ad->image_url, true);
                if (is_array($images) && count($images) > 0) {
                    Storage::disk('public')->delete($images);
                } elseif (is_string($images)) {
                    Storage::disk('public')->delete($images);
                }
            }
            if ($ad->video_url) {
                Storage::disk('public')->delete($ad->video_url);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('S3 Cleanup Error on Ad Deletion: ' . $e->getMessage());
        }

        // Глубокая очистка связанных данных для предотвращения сбоев целостности БД
        DB::table('favorites')->where('ad_id', $ad->id)->delete();
        DB::table('ad_views')->where('ad_id', $ad->id)->delete();
        DB::table('ad_clicks')->where('ad_id', $ad->id)->delete();
        DB::table('reports')->where('ad_id', $ad->id)->delete();
        
        // Защита финансовой отчетности: отвязываем платежи, сохраняя их в истории транзакций
        DB::table('payments')->where('ad_id', $ad->id)->update(['ad_id' => null]);

        $ad->delete();
        
        // Сбрасываем кэш SEO и главной страницы
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        return response()->json(['message' => 'Объявление успешно удалено']);
    }

    /**
     * Массовая загрузка объявлений через CSV (Для PRO пользователей)
     */
    public function bulkUpload(Request $request)
    {
        // Проверка: загружать файлы могут только PRO (business) аккаунты или Администраторы
        if ($request->user()->role !== 'business' && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Solo las cuentas PRO pueden hacer subidas masivas.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xml|max:10240', // Максимум 10 МБ (CSV или XML)
        ]);

        // Защита от обхода квот: проверяем лимиты PRO-пользователя перед массовой загрузкой
        $user = $request->user();
        $monthlyAds = Ad::where('user_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count();
        $maxAds = $user->role === 'admin' ? 999999 : 100;
        if ($monthlyAds >= $maxAds) {
            return response()->json(['message' => "Has alcanzado el límite de {$maxAds} anuncios mensuales."], 403);
        }
        $availableQuota = $maxAds - $monthlyAds;

        // Защита целостности данных (Integrity Bypass): загружаем список реальных категорий
        $validCategories = Cache::remember('valid_category_slugs', 86400, function() {
            return DB::table('categories')->pluck('slug')->toArray();
        });

        $path = $request->file('file')->getRealPath();
        $extension = $request->file('file')->getClientOriginalExtension();
        $count = 0;
        $batch = [];
        $batchSize = 500; // Пакетная вставка для защиты от таймаута сервера (504 Gateway Timeout)
        $now = now();

        if (strtolower($extension) === 'xml') {
            // Оптимизация памяти (OOM): используем потоковый XMLReader вместо simplexml_load_file (который грузит файл в RAM целиком)
            $reader = new \XMLReader();
            if ($reader->open($path)) {
                while ($reader->read()) {
                    if ($reader->nodeType == \XMLReader::ELEMENT && $reader->name == 'ad') {
                        $adNode = new \SimpleXMLElement($reader->readOuterXml());
                        
                    if ($count >= $availableQuota) {
                        \Illuminate\Support\Facades\Log::warning("Bulk upload quota reached for user " . $user->id);
                        break; // Останавливаем загрузку, если квота исчерпана
                    }
                    
                    $catSlug = substr((string)$adNode->category, 0, 100);
                    if (!in_array($catSlug, $validCategories)) $catSlug = 'general'; // Fallback на общую категорию

                    try {
                        $batch[] = [
                            'user_id' => $request->user()->id,
                            'title' => substr((string)$adNode->title, 0, 255),
                            'price' => is_numeric((string)$adNode->price) ? abs((float)$adNode->price) : 0,
                            'description' => (string)$adNode->description,
                            'location' => substr((string)$adNode->location, 0, 255),
                            'category' => $catSlug,
                            'status' => 'pending',
                            'created_at' => $now,
                            'updated_at' => $now,
                        ];
                        $count++;
                        
                        if (count($batch) >= $batchSize) {
                            Ad::insert($batch);
                            $batch = [];
                        }
                    } catch (\Exception $e) {
                        \Illuminate\Support\Facades\Log::warning("Skipped invalid XML row: " . $e->getMessage());
                    }
                    
                    $reader->next(); // Пропускаем поддерево, чтобы освободить память
                    }
                }
                $reader->close();
            }
        } else {
            // Потоковое чтение файла (Стриминг). Защищает сервер от падения по оперативной памяти (OOM)
            $handle = fopen($path, 'r');
            if ($handle !== false) {
                fgetcsv($handle); // Удаляем заголовки колонок
                while (($row = fgetcsv($handle)) !== false) {
                    if ($count >= $availableQuota) {
                        \Illuminate\Support\Facades\Log::warning("Bulk upload quota reached for user " . $user->id);
                        break; // Останавливаем загрузку, если квота исчерпана
                    }

                    if (count($row) >= 5) {
                        $catSlug = substr($row[4], 0, 100);
                        if (!in_array($catSlug, $validCategories)) $catSlug = 'general';

                        try {
                            $batch[] = [
                                'user_id' => $request->user()->id,
                                'title' => substr($row[0], 0, 255),
                                'price' => is_numeric($row[1]) ? abs((float) $row[1]) : 0,
                                'description' => $row[2],
                                'location' => substr($row[3], 0, 255),
                                'category' => $catSlug,
                                'status' => 'pending',
                                'created_at' => $now,
                                'updated_at' => $now,
                            ];
                            $count++;
                            
                            if (count($batch) >= $batchSize) {
                                Ad::insert($batch);
                                $batch = [];
                            }
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::warning("Skipped invalid CSV row: " . $e->getMessage());
                        }
                    }
                }
                fclose($handle);
            }
        }
        
        // Вставляем остатки
        if (count($batch) > 0) {
            Ad::insert($batch);
        }
        
        // Сбрасываем кэш, чтобы массово загруженные объявления сразу появились на сайте и в SEO-фидах
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        return response()->json(['message' => "$count anuncios subidos exitosamente."]);
    }

    /**
     * Получение списка объявлений на модерации (Для Админов)
     */
    public function pendingAds(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        
        $ads = Ad::with('user:id,name')->where('status', 'pending')->latest()->paginate(50);
        
        return response()->json($ads);
    }

    /**
     * Получение списка всех жалоб (Для Админов)
     */
    public function getReports(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        $reports = DB::table('reports')
            ->join('ads', 'reports.ad_id', '=', 'ads.id')
            ->leftJoin('users', 'reports.user_id', '=', 'users.id')
            ->select('reports.*', 'ads.title as ad_title', 'ads.status as ad_status', 'users.name as reporter_name')
            ->orderByDesc('reports.created_at')
            ->paginate(50);
        return response()->json($reports);
    }

    public function deleteReport(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }
        DB::table('reports')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }

    /**
     * Record an ad view
     */
    public function recordView(Request $request, $id)
    {
        $ad = Ad::find($id);
        if ($ad) {
            if ($ad->status !== 'active') {
                return response()->json(['message' => 'Anuncio inactivo', 'ignored' => true]);
            }

            // Доверяем только Laravel proxy handling, а не клиентским заголовкам напрямую.
            $clientIpHash = hash('sha256', (string) $request->ip()); // GDPR Compliance: Анонимизируем IP-адрес

            // Защита от накрутки: засчитываем только 1 уникальный просмотр с IP в течение часа
            $recentView = DB::table('ad_views')
                ->where('ad_id', $ad->id)
                ->where('ip_address', $clientIpHash)
                ->where('created_at', '>=', now()->subHour())
                ->exists();

            if (!$recentView) {
                $ad->increment('views');

                DB::table('ad_views')->insert([
                    'ad_id' => $ad->id,
                    'user_id' => auth('sanctum')->id(),
                    'ip_address' => $clientIpHash,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                return response()->json(['success' => true, 'views' => $ad->views]);
            }
            
            return response()->json(['success' => true, 'views' => $ad->views, 'ignored' => true]);
        }
        return response()->json(['message' => 'Ad not found'], 404);
    }

    /**
     * Пожаловаться на объявление (Report)
     */
    public function report(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:255',
            'comments' => 'nullable|string|max:1000'
        ]);
        
        // Защита от сбоя целостности БД (Foreign Key Violation)
        if (!Ad::where('id', $id)->exists()) {
            return response()->json(['message' => 'Anuncio no encontrado'], 404);
        }
        
        DB::table('reports')->insert([
            'ad_id' => $id,
            'user_id' => auth('sanctum')->id(), // Может быть null для гостей
            'reason' => $request->reason,
            'comments' => $request->comments,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['message' => 'Reporte enviado exitosamente. Gracias por ayudarnos a mantener la plataforma segura.']);
    }

    /**
     * Получение ID избранных объявлений пользователя
     */
    public function favorites(Request $request)
    {
        $favoriteIds = DB::table('favorites')
            ->where('user_id', $request->user()->id)
            ->pluck('ad_id');
            
        return response()->json($favoriteIds);
    }

    /**
     * Добавление/удаление объявления из избранного (Тумблер)
     */
    public function toggleFavorite(Request $request, $id)
    {
        $userId = $request->user()->id;
        
        // Проверяем существует ли объявление
        $ad = Ad::find($id);
        if (!$ad || ($ad->status !== 'active' && $ad->user_id !== $userId)) {
            return response()->json(['message' => 'Anuncio no disponible'], 404);
        }

        $exists = DB::table('favorites')->where('user_id', $userId)->where('ad_id', $id)->exists();

        if ($exists) {
            DB::table('favorites')->where('user_id', $userId)->where('ad_id', $id)->delete();
            return response()->json(['status' => 'removed']);
        } else {
            // Защита от переполнения памяти (DB Bloat): ограничиваем Избранное 1000 объявлениями
            $count = DB::table('favorites')->where('user_id', $userId)->count();
            if ($count >= 1000) {
                return response()->json(['message' => 'Has alcanzado el límite máximo de favoritos (1000).'], 400);
            }

            // Защита от Race Condition: игнорируем дубликаты при быстром двойном клике в приложении
            DB::table('favorites')->insertOrIgnore(['user_id' => $userId, 'ad_id' => $id, 'created_at' => now(), 'updated_at' => now()]);
            return response()->json(['status' => 'added']);
        }
    }

    /**
     * Получение всех объявлений текущего пользователя
     */
    public function myAds(Request $request)
    {
        $ads = Ad::with('user:id,name,role,avatar_url,is_verified,created_at')
            ->addSelect(['whatsapp_clicks' => DB::table('ad_clicks')
                ->selectRaw('count(*)')
                ->whereColumn('ad_id', 'ads.id')
                ->where('channel', 'whatsapp')
            ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(500); // Защита UX: увеличиваем лимит, чтобы PRO-продавцы не теряли доступ к своим объявлениям (фронтенд пока не поддерживает кнопку "Загрузить еще" в дашборде)
            
        return response()->json($ads);
    }

    /**
     * Получение полных данных избранных объявлений пользователя
     */
    public function favoriteAds(Request $request)
    {
        $userId = $request->user()->id;
        // Защита приватности: не отдаем статистику кликов чужих объявлений
        $ads = Ad::with('user:id,name,role,avatar_url,is_verified,created_at')
            ->whereIn('id', function($query) use ($userId) {
                $query->select('ad_id')->from('favorites')->where('user_id', $userId);
            })
            ->latest()
            ->paginate(500); // Увеличиваем лимит для корректного отображения в личном кабинете
            
        return response()->json($ads);
    }

    /**
     * Fetch time-series analytics data for the user's dashboard chart
     */
    public function analytics(Request $request)
    {
        $userId = $request->user()->id;
        $days = (int) $request->input('days', 7);
        $days = max(1, min(90, $days)); // Sanitize to a max of 90 days

        // Get clicks for the requested days range for this user's ads
        $clicks = DB::table('ad_clicks')
            ->join('ads', 'ad_clicks.ad_id', '=', 'ads.id')
            ->where('ads.user_id', $userId)
            ->where('ad_clicks.created_at', '>=', now()->subDays($days - 1)->startOfDay())
            ->where('ad_clicks.channel', 'whatsapp')
            ->selectRaw('DATE(ad_clicks.created_at) as date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Get views for the requested days range for this user's ads
        $views = DB::table('ad_views')
            ->join('ads', 'ad_views.ad_id', '=', 'ads.id')
            ->where('ads.user_id', $userId)
            ->where('ad_views.created_at', '>=', now()->subDays($days - 1)->startOfDay())
            ->selectRaw('DATE(ad_views.created_at) as date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Fill missing days to ensure a complete X-day timeline
        $data = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $dateObj = now()->subDays($i);
            $dateStr = $dateObj->format('Y-m-d');
            $match = $clicks->firstWhere('date', $dateStr);
            $matchViews = $views->firstWhere('date', $dateStr);
            $data[] = [
                'date' => $dateObj->format($days > 14 ? 'd/m' : 'M d'), // Shorten format for long ranges
                'clicks' => $match ? (int) $match->count : 0,
                'views' => $matchViews ? (int) $matchViews->count : 0
            ];
        }

        return response()->json($data);
    }

    /**
     * Генерация динамического Sitemap XML для поисковых систем
     */
    public function sitemap()
    {
        // Кэшируем карту сайта в Redis на 1 час (3600 секунд)
        $xml = Cache::remember('sitemap_xml', 3600, function () {
            // Оптимизация памяти (OOM): используем DB фасады для получения сырых объектов, вместо тяжелых моделей Eloquent
            $ads = DB::table('ads')->where('status', 'active')->latest()->limit(10000)->get(['id', 'updated_at', 'category']);
            
            $content = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            $content .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            
            $content .= "   <url>\n      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/</loc>\n      <changefreq>always</changefreq>\n      <priority>1.0</priority>\n   </url>\n";
            
            // SEO: Добавляем статические страницы в карту сайта
            $staticPages = ['terms', 'privacy', 'help', 'safety'];
            foreach ($staticPages as $page) {
                $content .= "   <url>\n";
                $content .= "      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/{$page}</loc>\n";
                $content .= "      <changefreq>monthly</changefreq>\n      <priority>0.5</priority>\n   </url>\n";
            }

            $categories = $ads->pluck('category')->unique();
            foreach ($categories as $category) {
                $content .= "   <url>\n";
                $content .= "      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/?cat=" . urlencode($category) . "</loc>\n";
                $content .= "      <changefreq>hourly</changefreq>\n      <priority>0.9</priority>\n   </url>\n";
            }
            
            foreach ($ads as $ad) {
                $content .= "   <url>\n";
                $content .= "      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/?ad=" . $ad->id . "</loc>\n";
                $content .= "      <lastmod>" . \Carbon\Carbon::parse($ad->updated_at)->toAtomString() . "</lastmod>\n";
                $content .= "      <changefreq>daily</changefreq>\n      <priority>0.8</priority>\n   </url>\n";
            }
            
            $content .= '</urlset>';
            return $content;
        });
        
        return response($xml)->header('Content-Type', 'application/xml');
    }

    /**
     * Генерация PDF-брошюры для объявления
     */
    public function generatePdf($id)
    {
        $ad = Ad::with('user')->findOrFail($id);

        // Защита от IDOR: скрытые объявления нельзя экспортировать в PDF
        if ($ad->status !== 'active') {
            $user = auth('sanctum')->user();
            if (!$user || ($user->id !== $ad->user_id && $user->role !== 'admin')) {
                return response()->json(['message' => 'Anuncio no disponible para exportación.'], 403);
            }
        }

        // Генерируем PDF только для категории "недвижимость"
        if ($ad->category !== 'inmobiliaria') {
            return response()->json(['message' => 'PDF брошюры доступны только для недвижимости.'], 403);
        }

        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode(config('app.frontend_url', 'https://mercasto.com') . '/?ad=' . $ad->id);

        $data = [
            'ad' => $ad,
            'qrCodeUrl' => $qrCodeUrl,
        ];

        // Загружаем HTML из Blade-шаблона и передаем данные
        $pdf = Pdf::loadView('pdf.ad_brochure', $data);

        // Отдаем PDF в браузер для просмотра или скачивания
        return $pdf->stream('mercasto-ad-'.$ad->id.'.pdf');
    }

    /**
     * Генерация XML-фида для Google Merchant Center
     */
    public function googleMerchantFeed()
    {
        // Кэшируем фид Merchant в Redis на 1 час (3600 секунд)
        $xml = Cache::remember('google_merchant_xml', 3600, function () {
            $ads = Ad::with('user:id,name')
                ->where('status', 'active')
                ->where('price', '>', 0)
                ->latest()
                ->limit(5000)
                ->get();
            return view('xml.google_merchant', ['ads' => $ads])->render();
        });

        return response($xml)->header('Content-Type', 'application/xml');
    }

    /**
     * Запись клика по кнопкам контактов (WhatsApp / Telegram) для аналитики
     */
    public function recordClick(Request $request, $id)
    {
        $request->validate(['channel' => 'required|string']);
        $ad = Ad::findOrFail($id);
        
        if ($ad->status !== 'active') {
            return response()->json(['message' => 'Anuncio inactivo', 'ignored' => true]);
        }

        $clientIpHash = hash('sha256', (string) $request->ip()); // GDPR Compliance

        // Защита от накрутки конверсии: 1 уникальный клик (WhatsApp/Telegram) с IP раз в 15 минут
        $recentClick = DB::table('ad_clicks')
            ->where('ad_id', $ad->id)
            ->where('ip_address', $clientIpHash)
            ->where('channel', $request->channel)
            ->where('created_at', '>=', now()->subMinutes(15))
            ->exists();

        if (!$recentClick) {
            DB::table('ad_clicks')->insert([
                'ad_id' => $ad->id,
                'user_id' => auth('sanctum')->id(),
                'channel' => $request->channel,
                'ip_address' => $clientIpHash,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        return response()->json(['success' => true]);
    }

    /**
     * Автоматическая генерация описания товара с помощью Google Gemini AI
     */
    public function generateDescription(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:5120',
        ]);

        // Защита от сбоя в продакшене (Config Cache Bug): env() возвращает null при кэшировании конфигов
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) {
            return response()->json(['message' => 'La clave de API de Gemini no está configurada.'], 501);
        }

        $mimeType = $request->file('image')->getMimeType();
        $base64Image = base64_encode(file_get_contents($request->file('image')->getRealPath()));

        // Защита от зависания PHP-воркеров (Worker Starvation) при сбое серверов Google
        $response = Http::timeout(15)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
            'contents' => [
                [
                    'parts' => [
                        ['text' => 'Escribe una descripción atractiva y altamente optimizada para SEO y AEO (Answer Engine Optimization) para vender este producto en un mercado de clasificados. Incluye palabras clave relevantes de forma natural, destaca sus mejores características visuales y responde implícitamente a las preguntas más comunes que tendría un comprador. Usa un tono vendedor, persuasivo y estructurado (puedes usar viñetas cortas si es necesario) para que sea fácil de indexar por Google y leer por IAs conversacionales. Solo devuelve la descripción sin introducciones ni comillas. Idioma: Español.'],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $base64Image
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        if ($response->successful()) {
            $text = $response->json('candidates.0.content.parts.0.text');
            return response()->json(['description' => trim($text)]);
        }

        \Illuminate\Support\Facades\Log::error('Gemini API Error: ' . $response->body());
        return response()->json(['message' => 'Error al analizar la imagen con IA.'], 500);
    }

    /**
     * AI Agent for PostgreSQL (Text-to-SQL & Database Insights)
     */
    public function askPostgresAgent(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $request->validate(['query' => 'required|string']);
        
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) {
            return response()->json(['message' => 'La clave de API de Gemini no está configurada.'], 501);
        }

        $schema = "Tables: ads(id, title, price, status, views, category, created_at), users(id, name, email, role, created_at), ad_clicks(ad_id, channel, created_at).";
        $prompt = "You are a PostgreSQL DBA. Schema: {$schema}. Translate this request to SQL: '{$request->query}'. Return ONLY the raw SELECT query without markdown formatting.";

        $response = Http::timeout(15)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
            'contents' => [['parts' => [['text' => $prompt]]]]
        ]);

        if ($response->successful()) {
            $sql = trim(str_replace(['```sql', '```', '`'], '', $response->json('candidates.0.content.parts.0.text')));
            
            try {
                if (!preg_match('/^\s*SELECT/i', $sql)) throw new \Exception("Solo se permiten consultas SELECT por seguridad.");
                $data = DB::select($sql);
                return response()->json([
                    'agent' => '🐘 PostgreSQL DBA AI',
                    'sql' => $sql,
                    'data' => $data,
                    'status' => 'success'
                ]);
            } catch (\Exception $e) {
                return response()->json(['agent' => '🐘 PostgreSQL DBA AI', 'error' => $e->getMessage(), 'sql' => $sql], 400);
            }
        }
        
        return response()->json(['message' => 'Error al analizar la base de datos'], 500);
    }

    /**
     * AI Agent for React (Generative UI)
     */
    public function generateReactComponent(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $request->validate(['prompt' => 'required|string']);
        
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) {
            return response()->json(['message' => 'La clave de API de Gemini no está configurada.'], 501);
        }

        $prompt = "You are an expert React + Tailwind CSS v4 developer. Create a component based on this request: '{$request->prompt}'. Use Lucide React for icons. Return ONLY valid raw JSX code, NO markdown blocks, NO explanations.";

        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={$apiKey}", [
            'contents' => [['parts' => [['text' => $prompt]]]]
        ]);

        if ($response->successful()) {
            $jsx = trim(str_replace(['```jsx', '```react', '```', 'javascriptreact'], '', $response->json('candidates.0.content.parts.0.text')));
            return response()->json([
                'agent' => '⚛️ React UI Engineer AI',
                'response' => $jsx,
                'status' => 'success'
            ]);
        }
        
        return response()->json(['message' => 'Error al generar el componente'], 500);
    }

    /**
     * AI Agent for Business Strategy (CEO Alex)
     */
    public function askCeoAgent(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $request->validate(['query' => 'required|string']);
        
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) {
            return response()->json(['message' => 'La clave de API de Gemini no está configurada.'], 501);
        }

        $prompt = "You are Alex, the visionary CEO and founder of Mercasto (a fast-growing marketplace in Mexico). You are talking to your technical administrator. Answer their question or request strategically, professionally, but with a visionary and encouraging tone. Use Russian language since the admin interface is in Russian. Request: '{$request->query}'";

        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={$apiKey}", [
            'contents' => [['parts' => [['text' => $prompt]]]]
        ]);

        if ($response->successful()) {
            $text = trim(str_replace(['```markdown', '```'], '', $response->json('candidates.0.content.parts.0.text')));
            return response()->json([
                'agent' => '👔 CEO Alex',
                'response' => $text,
                'status' => 'success'
            ]);
        }
        
        return response()->json(['message' => 'Error de conexión con el CEO'], 500);
    }

    /**
     * AI Agent for Marketing (CMO)
     */
    public function askMarketingAgent(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $request->validate(['query' => 'required|string']);
        
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) return response()->json(['message' => 'La clave de API no está configurada.'], 501);

        $prompt = "You are the Chief Marketing Officer (CMO) of Mercasto. Provide expert advice on digital marketing, user acquisition, conversion rate optimization, and advertising campaigns. Use Russian language. Request: '{$request->query}'";

        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={$apiKey}", [
            'contents' => [['parts' => [['text' => $prompt]]]]
        ]);

        if ($response->successful()) {
            return response()->json([
                'agent' => '📈 Маркетолог',
                'response' => trim(str_replace(['```markdown', '```'], '', $response->json('candidates.0.content.parts.0.text'))),
                'status' => 'success'
            ]);
        }
        
        return response()->json(['message' => 'Error de conexión con el Marketer'], 500);
    }

    /**
     * AI Agent for SEO
     */
    public function askSeoAgent(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $request->validate(['query' => 'required|string']);
        
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) return response()->json(['message' => 'La clave de API no está configurada.'], 501);

        $prompt = "You are the Lead SEO Specialist of Mercasto. Provide expert advice on search engine optimization, keywords, technical SEO, structured data, and content strategy for the marketplace. Use Russian language. Request: '{$request->query}'";

        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={$apiKey}", [
            'contents' => [['parts' => [['text' => $prompt]]]]
        ]);

        if ($response->successful()) {
            return response()->json([
                'agent' => '🔍 SEO-специалист',
                'response' => trim(str_replace(['```markdown', '```'], '', $response->json('candidates.0.content.parts.0.text'))),
                'status' => 'success'
            ]);
        }
        
        return response()->json(['message' => 'Error de conexión con el SEO'], 500);
    }

    /**
     * AI Agent for Chief UI Officer
     */
    public function askCeoUiAgent(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $request->validate(['query' => 'required|string']);
        
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) return response()->json(['message' => 'La clave de API no está configurada.'], 501);

        $prompt = "You are the Chief UI Officer (Head of User Interface) of Mercasto. Provide expert advice on visual design, color palettes, typography, component styling, and overall aesthetics for the marketplace. Use Russian language. Request: '{$request->query}'";

        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={$apiKey}", [
            'contents' => [['parts' => [['text' => $prompt]]]]
        ]);

        if ($response->successful()) {
            return response()->json([
                'agent' => '🎨 CEO UI',
                'response' => trim(str_replace(['```markdown', '```'], '', $response->json('candidates.0.content.parts.0.text'))),
                'status' => 'success'
            ]);
        }
        
        return response()->json(['message' => 'Error de conexión con el CEO UI'], 500);
    }

    /**
     * AI Agent for Chief UX Officer
     */
    public function askCeoUxAgent(Request $request)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Acceso denegado'], 403);
        $request->validate(['query' => 'required|string']);
        
        $apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$apiKey) return response()->json(['message' => 'La clave de API no está configurada.'], 501);

        $prompt = "You are the Chief UX Officer (Head of User Experience) of Mercasto. Provide expert advice on user flows, wireframing, usability, accessibility, interaction design, and overall user journey optimization for the marketplace. Use Russian language. Request: '{$request->query}'";

        $response = Http::timeout(30)->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={$apiKey}", [
            'contents' => [['parts' => [['text' => $prompt]]]]
        ]);

        if ($response->successful()) {
            return response()->json([
                'agent' => '🧠 CEO UX',
                'response' => trim(str_replace(['```markdown', '```'], '', $response->json('candidates.0.content.parts.0.text'))),
                'status' => 'success'
            ]);
        }
        
        return response()->json(['message' => 'Error de conexión con el CEO UX'], 500);
    }
}
