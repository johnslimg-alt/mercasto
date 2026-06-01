<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Intervention\Image\Alignment;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Events\NewNotification;
use App\Jobs\ProcessVideoWatermark;
use App\Jobs\NotifyPriceDropJob;
use App\Jobs\ProcessReferralRewardJob;
use App\Mail\NewAdInCategory;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class AdController extends Controller
{
    private const PUBLIC_AD_USER_COLUMNS = 'id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp';

    private function imageManager(): ImageManager
    {
        return ImageManager::usingDriver(Driver::class);
    }

    private function geocodeApproximateLocation(?string $location, ?string $state = null): array
    {
        $query = trim(collect([$location, $state, 'México'])->filter()->implode(', '));

        if ($query !== '') {
            $apiKey = config('services.google.maps_api_key');
            if ($apiKey) {
                try {
                    $response = Http::timeout(5)->get('https://maps.googleapis.com/maps/api/geocode/json', [
                        'address' => $query,
                        'key' => $apiKey,
                    ]);

                    if ($response->successful() && !empty($response->json('results'))) {
                        $geometry = $response->json('results.0.geometry.location');
                        return [(float) $geometry['lat'], (float) $geometry['lng']];
                    }
                } catch (\Throwable $e) {
                    // Fall through to local Mexico centroids if the paid provider is unavailable.
                }
            }
        }

        $centroids = [
            'aguascalientes' => [21.8853, -102.2916],
            'baja california' => [30.8406, -115.2838],
            'baja california sur' => [26.0444, -111.6661],
            'campeche' => [19.8301, -90.5349],
            'chiapas' => [16.7569, -93.1292],
            'chihuahua' => [28.6330, -106.0691],
            'ciudad de mexico' => [19.4326, -99.1332],
            'ciudad de méxico' => [19.4326, -99.1332],
            'cdmx' => [19.4326, -99.1332],
            'coahuila' => [27.0587, -101.7068],
            'colima' => [19.2433, -103.7247],
            'durango' => [24.0277, -104.6532],
            'guanajuato' => [21.0190, -101.2574],
            'guerrero' => [17.4392, -99.5451],
            'hidalgo' => [20.0911, -98.7624],
            'jalisco' => [20.6597, -103.3496],
            'guadalajara' => [20.6597, -103.3496],
            'puerto vallarta' => [20.6534, -105.2253],
            'mexico' => [19.3565, -99.6312],
            'méxico' => [19.3565, -99.6312],
            'estado de mexico' => [19.3565, -99.6312],
            'estado de méxico' => [19.3565, -99.6312],
            'michoacan' => [19.5665, -101.7068],
            'michoacán' => [19.5665, -101.7068],
            'morelos' => [18.6813, -99.1013],
            'nayarit' => [21.7514, -104.8455],
            'nuevo leon' => [25.5922, -100.0574],
            'nuevo león' => [25.5922, -100.0574],
            'monterrey' => [25.6866, -100.3161],
            'oaxaca' => [17.0732, -96.7266],
            'puebla' => [19.0414, -98.2063],
            'queretaro' => [20.5888, -100.3899],
            'querétaro' => [20.5888, -100.3899],
            'quintana roo' => [19.1847, -88.4753],
            'cancun' => [21.1619, -86.8515],
            'cancún' => [21.1619, -86.8515],
            'san luis potosi' => [22.1565, -100.9855],
            'san luis potosí' => [22.1565, -100.9855],
            'sinaloa' => [25.1721, -107.4795],
            'sonora' => [29.2972, -110.3309],
            'tabasco' => [17.8409, -92.6189],
            'tamaulipas' => [24.2669, -98.8363],
            'tlaxcala' => [19.3182, -98.2375],
            'veracruz' => [19.1738, -96.1342],
            'yucatan' => [20.7099, -89.0943],
            'yucatán' => [20.7099, -89.0943],
            'merida' => [20.9674, -89.5926],
            'mérida' => [20.9674, -89.5926],
            'zacatecas' => [22.7709, -102.5832],
        ];

        $haystack = Str::of(trim(($location ?? '') . ' ' . ($state ?? '')))
            ->lower()
            ->ascii()
            ->toString();

        foreach ($centroids as $name => $coords) {
            $needle = Str::of($name)->lower()->ascii()->toString();
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return $coords;
            }
        }

        return [23.6345, -102.5528];
    }

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
        $query = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS);

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
            $location = trim((string) $request->location);
            $normalizedLocation = mb_strtolower($location);
            $allMexicoAliases = ['todo mexico', 'todo méxico', 'all mexico', 'mexico', 'méxico'];

            if (! in_array($normalizedLocation, $allMexicoAliases, true)) {
                $locationParts = collect([$location])
                    ->merge(explode(',', $location))
                    ->merge(explode('·', $location))
                    ->merge(explode('-', $location))
                    ->map(fn ($part) => trim($part))
                    ->filter()
                    ->unique()
                    ->values();

                $query->where(function ($q) use ($locationParts) {
                    foreach ($locationParts as $index => $part) {
                        $like = '%' . $part . '%';
                        $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';

                        $q->{$method}('location ILIKE ? OR state ILIKE ?', [$like, $like]);
                    }
                });
            }
        }

        if ($request->filled('state')) {
            $state = trim((string) $request->state);

            if ($state !== '') {
                $query->whereRaw('state ILIKE ?', [$state]);
            }
        }

        if ($request->filled('city')) {
            $cityParts = collect(explode(',', (string) $request->city))
                ->map(fn ($part) => trim($part))
                ->filter()
                ->unique()
                ->values();

            $query->where(function ($q) use ($cityParts) {
                foreach ($cityParts as $index => $part) {
                    $like = '%' . $part . '%';
                    $method = $index === 0 ? 'whereRaw' : 'orWhereRaw';

                    $q->{$method}('location ILIKE ?', [$like]);
                }
            });
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
        elseif ($sort === 'latest' && !$request->filled('radius')) {
            $query->orderByRaw("
                CASE
                    WHEN promoted = 'destacado' AND (boost_expires_at IS NULL OR boost_expires_at > NOW()) THEN 0
                    WHEN promoted = 'highlight' AND (boost_expires_at IS NULL OR boost_expires_at > NOW()) THEN 1
                    WHEN promoted = 'urgente' AND (boost_expires_at IS NULL OR boost_expires_at > NOW()) THEN 2
                    ELSE 3
                END
            ")->latest();
        }

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
            'city',
            'state',
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
        $ad = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)->findOrFail($id);

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
            'state' => 'nullable|string|max:60',
            'category' => 'required|string|exists:categories,slug', // Строгая привязка к БД, защита от Data Integrity Bypass
            'images' => 'nullable|array|max:10', // Максимум 10 картинок
            'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096', // Максимум 5МБ и защита от OOM-бомб (Pixel Flooding)
            'condition' => 'nullable|in:nuevo,usado',
            'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200', // 50MB Max
            'attributes' => 'nullable|array', // Динамические характеристики (марка, модель, ОЗУ и т.д.)
        ]);

        // Защита бизнес-модели: лимиты берём из активного платного плана пользователя.
        $user = $request->user();
        $monthlyAds = Ad::where('user_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count();
        $maxAds = $this->monthlyAdLimit($user);
        if ($monthlyAds >= $maxAds && $user->role !== 'admin') {
            return response()->json(['message' => "Has alcanzado el límite de {$maxAds} anuncios mensuales de tu plan. Actualiza tu plan para publicar más."], 403);
        }

        [$lat, $lng] = $this->geocodeApproximateLocation($request->location, $request->state);

        $imagePaths = [];
        if ($request->hasFile('images')) {
            // Оптимизация памяти (OOM): выносим загрузку водяного знака за пределы цикла
            $watermarkPath = storage_path('app/public/logo-watermark.png');
            $hasWatermark = file_exists($watermarkPath);
            $manager = $this->imageManager();
            $watermark = $hasWatermark ? $manager->decode($watermarkPath) : null;

            foreach ($request->file('images') as $image) {
                // Generate a unique name and convert to WebP
                $filename = Str::uuid() . '.webp';
                $path = 'ads/' . $filename;

                $img = $manager->decode($image);

                // Защита от OOM (Out Of Memory) при загрузке огромных фото со смартфонов.
                // Уменьшаем изображение до разумных 1200px перед наложением водяного знака.
                $img->scaleDown(width: 1200, height: 1200);

                // Наложение водяного знака (логотипа)
                if ($watermark) {
                    $wm = clone $watermark;
                    // Масштабируем водяной знак до 15% ширины
                    $wm->scaleDown(width: (int) ($img->width() * 0.15));
                    // Добавляем отступы в 20px от краев
                    $img->insert($wm, alignment: Alignment::BOTTOM_RIGHT);
                }
                Storage::disk('public')->put($path, (string) $img->encodeUsingFileExtension('webp', quality: 85)); // Поддержка AWS S3
                $imagePaths[] = $path;
            }
        }

        $videoPath = null;
        $videoProcessingStatus = null;
        if ($request->hasFile('video_file')) {
            $videoPath = $request->file('video_file')->store('videos/originals', 'public');
            $videoProcessingStatus = 'pending';
        }

        $ad = Ad::create([
            'user_id' => $request->user()->id, // ID авторизованного пользователя
            'title' => strip_tags($request->title),
            'price' => $request->price,
            'condition' => $request->input('condition', 'usado'),
            'description' => strip_tags($request->description, '<p><br><b><i><ul><ol><li>'),
            'location' => $request->location,
            'state' => $request->state,
            'latitude' => $lat,
            'longitude' => $lng,
            'category' => $request->category,
            'attributes' => $request->filled('attributes') ? $request->input('attributes') : null,
            'image_url' => count($imagePaths) > 0 ? json_encode($imagePaths) : null,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
            'status' => 'pending', // Отправляем на модерацию
            'expires_at' => now()->addDays(30),
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
            ->count();

        // Сбрасываем кэш, чтобы новое объявление сразу появилось на главной странице и в SEO-картах
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        // Referral first-ad reward hook
        $adUser = Auth::user();
        if ($adUser && $adUser->referred_by) {
            $adCount = \Illuminate\Support\Facades\DB::table('ads')->where('user_id', $adUser->id)->count();
            if ($adCount === 1) {
                ProcessReferralRewardJob::dispatch($adUser->id);
            }
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
            return response()->json(['message' => 'No tienes permisos para editar este anuncio'], 403);
        }

        // 2. Валидация
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'price' => 'required|numeric|min:0',
            'description' => 'required|string',
            'location' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:60',
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
        // Пересчитываем координаты, только если локация или штат изменились
        if (($request->filled('location') && $request->location !== $ad->location) || (($request->input('state') ?? null) !== $ad->state)) {
            [$lat, $lng] = $this->geocodeApproximateLocation($request->location, $request->state);
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
            $manager = $this->imageManager();
            $watermark = $hasWatermark ? $manager->decode($watermarkPath) : null;

            foreach ($request->file('images') as $image) {
                // Generate a unique name and convert to WebP
                $filename = Str::uuid() . '.webp';
                $path = 'ads/' . $filename;
                $img = $manager->decode($image);
                // Защита от OOM (Out Of Memory) при загрузке огромных фото со смартфонов.
                // Уменьшаем изображение до разумных 1200px перед наложением водяного знака.
                $img->scaleDown(width: 1200, height: 1200);

                // Наложение водяного знака (логотипа)
                if ($watermark) {
                    $wm = clone $watermark;
                    // Масштабируем водяной знак до 15%
                    $wm->scaleDown(width: (int) ($img->width() * 0.15));
                    // Добавляем отступы в 20px от краев
                    $img->insert($wm, alignment: Alignment::BOTTOM_RIGHT);
                }

                Storage::disk('public')->put($path, (string) $img->encodeUsingFileExtension('webp', quality: 85)); // Поддержка AWS S3
                $newImagePaths[] = $path;
            }
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

        // 4. Detect price drop before updating
        $oldPrice = (float) $ad->price;
        $newPrice = (float) $validated['price'];
        $isPriceDrop = $newPrice < $oldPrice && $oldPrice > 0;

        // 4. Обновляем объявление
        $ad->update([
            'title' => strip_tags($validated['title']),
            'price' => $validated['price'],
            'condition' => $validated['condition'] ?? $ad->condition,
            'description' => strip_tags($validated['description'], '<p><br><b><i><ul><ol><li>'),
            'location' => $validated['location'],
            'state' => $validated['state'] ?? $ad->state,
            'latitude' => $lat,
            'longitude' => $lng,
            'category' => $validated['category'],
            'attributes' => $request->filled('attributes') ? $request->input('attributes') : $ad->attributes,
            'image_url' => count($finalImagePaths) > 0 ? json_encode($finalImagePaths) : null,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
            'status' => $needsReModeration ? 'pending' : $ad->status, // Сбрасываем статус, если были критичные изменения
        ]);

        // Handle price drop: persist old price and dispatch fan-out notifications
        if ($isPriceDrop) {
            $ad->update([
                'old_price'        => $oldPrice,
                'price_dropped_at' => now(),
            ]);
            DB::table('price_history')->insert([
                'ad_id'      => $ad->id,
                'old_price'  => $oldPrice,
                'new_price'  => $newPrice,
                'changed_at' => now(),
            ]);
            NotifyPriceDropJob::dispatch($ad->id, $oldPrice, $newPrice);
        }

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
            return response()->json(['message' => 'No tienes permisos para cambiar el estado de este anuncio'], 403);
        }

        $request->validate(['status' => 'required|in:active,inactive,archived,pending,paused,expired']);

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
            broadcast(new NewNotification((int) $ad->user_id, $notificationData))->toOthers();

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
        Cache::forget('ads_featured_block');
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
        $user = $request->user();

        $result = DB::transaction(function () use ($id, $user) {
            $ad = Ad::whereKey($id)->lockForUpdate()->firstOrFail();

            if ($user->id !== $ad->user_id && $user->role !== 'admin') {
                return ['response' => response()->json(['message' => 'No tienes permisos para promocionar este anuncio.'], 403)];
            }

            // Lock user + ad together so concurrent requests cannot double-spend credits.
            $creditUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($ad->promoted === 'destacado') {
                return ['response' => response()->json(['message' => 'Este anuncio ya se encuentra destacado.'], 400)];
            }

            $cost = 50; // Стоимость продвижения в créditos pagados
            $usedReferralCredit = false;

            if ((int) $creditUser->referral_credits > 0) {
                $creditUser->referral_credits = (int) $creditUser->referral_credits - 1;
                $usedReferralCredit = true;
            } elseif ((float) $creditUser->balance >= $cost) {
                $creditUser->balance = (float) $creditUser->balance - $cost;
            } else {
                return ['response' => response()->json(['message' => 'No tienes suficientes créditos'], 400)];
            }

            $creditUser->save();
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

            return [
                'balance' => $creditUser->balance,
                'referral_credits' => $creditUser->referral_credits,
                'used_referral_credit' => $usedReferralCredit,
            ];
        });

        if (isset($result['response'])) {
            return $result['response'];
        }

        // Инвалидируем кеш «Destacados», чтобы блок на главной обновился мгновенно
        Cache::forget('ads_featured_block');

        return response()->json([
            'success' => true,
            'balance' => $result['balance'],
            'referral_credits' => $result['referral_credits'],
            'used_referral_credit' => $result['used_referral_credit'],
        ]);
    }

    /**
     * Удаление объявления
     */
    public function destroy(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        // Проверяем, что объявление удаляет его владелец (или администратор)
        if ($request->user()->id !== $ad->user_id && $request->user()->role !== 'admin') {
            return response()->json(['message' => 'No tienes permisos para eliminar este anuncio'], 403);
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
        DB::table('ad_impressions')->where('ad_id', $ad->id)->delete();
        DB::table('reports')->where('ad_id', $ad->id)->delete();

        // Защита финансовой отчетности: отвязываем платежи, сохраняя их в истории транзакций
        DB::table('payments')->where('ad_id', $ad->id)->update(['ad_id' => null]);

        $ad->delete();

        // Сбрасываем кэш SEO и главной страницы
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_featured_block');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        return response()->json(['message' => 'Anuncio eliminado exitosamente']);
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
        $maxAds = $user->role === 'admin' ? 999999 : $this->monthlyAdLimit($user);
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
        return response()->json(['message' => 'Anuncio no encontrado'], 404);
    }

    /**
     * Record visible ad cards from feeds/search results in batches.
     */
    public function recordImpressions(Request $request)
    {
        $validated = $request->validate([
            'ad_ids' => 'required|array|min:1|max:50',
            'ad_ids.*' => 'integer|min:1',
            'placement' => 'nullable|string|in:feed,search,featured,profile,similar,vertical',
        ]);

        $adIds = collect($validated['ad_ids'])->unique()->values();
        $placement = $validated['placement'] ?? 'feed';
        $clientIpHash = hash('sha256', (string) $request->ip());
        $seenRecently = DB::table('ad_impressions')
            ->whereIn('ad_id', $adIds)
            ->where('ip_address', $clientIpHash)
            ->where('placement', $placement)
            ->where('created_at', '>=', now()->subHours(6))
            ->pluck('ad_id')
            ->all();

        $seenMap = array_flip($seenRecently);
        $validAdIds = DB::table('ads')
            ->whereIn('id', $adIds)
            ->where('status', 'active')
            ->pluck('id');

        $rows = $validAdIds
            ->reject(fn ($adId) => isset($seenMap[$adId]))
            ->map(fn ($adId) => [
                'ad_id' => $adId,
                'user_id' => auth('sanctum')->id(),
                'ip_address' => $clientIpHash,
                'placement' => $placement,
                'created_at' => now(),
                'updated_at' => now(),
            ])
            ->values()
            ->all();

        if ($rows) {
            DB::table('ad_impressions')->insert($rows);
        }

        return response()->json(['success' => true, 'recorded' => count($rows)]);
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
        $ads = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
            ->addSelect(['whatsapp_clicks' => DB::table('ad_clicks')
                ->selectRaw('count(*)')
                ->whereColumn('ad_id', 'ads.id')
            ])
            ->addSelect(['impressions_count' => DB::table('ad_impressions')
                ->selectRaw('count(*)')
                ->whereColumn('ad_id', 'ads.id')
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
        $ads = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
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
            ->selectRaw('DATE(ad_clicks.created_at) as date, count(*) as count')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $impressions = DB::table('ad_impressions')
            ->join('ads', 'ad_impressions.ad_id', '=', 'ads.id')
            ->where('ads.user_id', $userId)
            ->where('ad_impressions.created_at', '>=', now()->subDays($days - 1)->startOfDay())
            ->selectRaw('DATE(ad_impressions.created_at) as date, count(*) as count')
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
            $matchImpressions = $impressions->firstWhere('date', $dateStr);
            $matchViews = $views->firstWhere('date', $dateStr);
            $impressionCount = $matchImpressions ? (int) $matchImpressions->count : 0;
            $clickCount = $match ? (int) $match->count : 0;
            $data[] = [
                'date' => $dateObj->format($days > 14 ? 'd/m' : 'M d'), // Shorten format for long ranges
                'clicks' => $clickCount,
                'views' => $matchViews ? (int) $matchViews->count : 0,
                'impressions' => $impressionCount,
                'ctr' => $impressionCount > 0 ? round(($clickCount / $impressionCount) * 100, 2) : 0,
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
            return response()->json(['message' => 'Los folletos PDF solo están disponibles para inmuebles.'], 403);
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
     * Запись клика по кнопкам контактов и шаринга для аналитики
     */
    public function recordClick(Request $request, $id)
    {
        $request->validate(['channel' => 'required|string|in:whatsapp,telegram,email,share,profile,phone']);
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
     * Generate ad description using DeepSeek AI (text fields, no image required)
     * POST /api/ads/generate-description
     */
    public function generateDescription(Request $request)
    {
        $request->validate([
            'title'      => 'required|string|max:200',
            'category'   => 'nullable|string|max:100',
            'condition'  => 'nullable|string|max:50',
            'location'   => 'nullable|string|max:255',
            'price'      => 'nullable|numeric',
            'attributes' => 'nullable|array',
        ]);

        // Rate limiting: max 10 requests per user per hour
        $rateLimitKey = 'ai-desc:' . $request->user()->id;
        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($rateLimitKey, 10)) {
            $seconds = \Illuminate\Support\Facades\RateLimiter::availableIn($rateLimitKey);
            return response()->json([
                'error' => "Límite de generaciones alcanzado. Inténtalo en {$seconds} segundos.",
            ], 429);
        }
        \Illuminate\Support\Facades\RateLimiter::hit($rateLimitKey, 3600);

        $facts  = "Título: {$request->title}\n";
        if ($request->category)  $facts .= "Categoría: {$request->category}\n";
        if ($request->condition) $facts .= "Condición: {$request->condition}\n";
        if ($request->location)  $facts .= "Ubicación: {$request->location}\n";
        if ($request->price)     $facts .= "Precio: \${$request->price} MXN\n";
        if ($request->attributes) {
            foreach ($request->attributes as $attrKey => $attrValue) {
                if (is_scalar($attrValue) && $attrValue !== '') {
                    $facts .= ucfirst($attrKey) . ": {$attrValue}\n";
                }
            }
        }

        try {
            /** @var \App\Services\DeepSeekClient $client */
            $client = app(\App\Services\DeepSeekClient::class);
            $result = $client->chatFlash(
                [
                    [
                        'role' => 'system',
                        'content' => 'Redactas anuncios para Mercasto.com. Regla principal: usa SOLO los datos confirmados por el usuario. Prohibido inventar color, batería, accesorios, garantía, factura, caja, cargador, rayones, golpes, envíos o entregas si no están en los datos. Si faltan detalles, invita a preguntar. Responde solo la descripción en español mexicano profesional.',
                    ],
                    [
                        'role' => 'user',
                        'content' => "Datos confirmados:\n{$facts}\nEscribe una descripción atractiva, honesta y breve. Máximo 100 palabras.",
                    ],
                ],
                ['max_tokens' => 160, 'temperature' => 0]
            );

            $text = $result['choices'][0]['message']['content'] ?? null;
            if (!$text) {
                throw new \RuntimeException('Empty response from DeepSeek.');
            }

            $description = trim($text);
            if ($this->containsUnsupportedAiClaims($description, $request)) {
                $description = $this->safeGeneratedDescription($request);
            }

            return response()->json(['description' => $description]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('DeepSeek generateDescription error: ' . $e->getMessage());
            return response()->json([
                'error' => 'No se pudo generar la descripción. Inténtalo de nuevo.',
            ], 500);
        }
    }

    private function containsUnsupportedAiClaims(string $description, Request $request): bool
    {
        $source = Str::lower(implode(' ', array_filter([
            $request->title,
            $request->category,
            $request->condition,
            $request->location,
            $request->price,
            is_array($request->attributes) ? json_encode($request->attributes, JSON_UNESCAPED_UNICODE) : null,
        ])));
        $text = Str::lower($description);

        foreach ([
            'batería', 'bateria', 'caja', 'cable', 'cargador', 'garantía', 'garantia',
            'factura', 'rayones', 'golpes', 'funda', 'mica', 'color', 'negro', 'blanco',
            'morado', 'azul', 'rojo', 'dorado', 'plata', 'gris', 'envío', 'envio',
            'entrega', 'original',
        ] as $term) {
            if (Str::contains($text, $term) && ! Str::contains($source, $term)) {
                return true;
            }
        }

        return false;
    }

    private function safeGeneratedDescription(Request $request): string
    {
        $title = trim(strip_tags((string) $request->title));
        $parts = ["Vendo {$title} en Mercasto."];

        if ($request->condition) {
            $parts[] = 'Condición: ' . trim(strip_tags((string) $request->condition)) . '.';
        }

        if ($request->price) {
            $parts[] = 'Precio: $' . number_format((float) $request->price, 0) . ' MXN.';
        }

        if ($request->location) {
            $parts[] = 'Disponible en ' . trim(strip_tags((string) $request->location)) . '.';
        }

        $parts[] = 'Escríbeme para resolver dudas, pedir más información o coordinar la compra.';

        return implode(' ', $parts);
    }

    /**
     * AI Agent for PostgreSQL (Text-to-SQL & Database Insights)
     */
    public function askPostgresAgent(Request $request)
    {
        if ($denied = $this->denyNonAdmin($request)) return $denied;
        $request->validate(['query' => 'required|string|max:1000']);
        $query = (string) $request->input('query');

        $schema = "Tables: ads(id, title, price, status, views, category, created_at), users(id, name, role, created_at), ad_clicks(ad_id, channel, created_at).";
        $prompt = "Schema: {$schema}\nRequest: {$query}\nReturn ONLY one safe PostgreSQL SELECT query using only these tables and columns. Include LIMIT 50 or less. No markdown. No semicolon.";

        try {
            $sql = $this->askAiText(
                'You are a PostgreSQL DBA. Generate read-only SQL only. Never modify data.',
                $prompt,
                220
            );
            $sql = $this->safeAgentSelectSql($sql);

            return response()->json([
                'agent' => 'PostgreSQL DBA AI',
                'sql' => $sql,
                'data' => $this->runAgentSelect($sql),
                'status' => 'success',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['agent' => 'PostgreSQL DBA AI', 'error' => $e->getMessage()], 400);
        }
    }

    /**
     * AI Agent for React (Generative UI)
     */
    public function generateReactComponent(Request $request)
    {
        if ($denied = $this->denyNonAdmin($request)) return $denied;
        $request->validate(['prompt' => 'required|string|max:1500']);
        $prompt = (string) $request->input('prompt');

        return $this->agentTextResponse(
            'React UI Engineer AI',
            'You are an expert React 19 + Tailwind CSS v4 developer. Return only raw JSX code. No markdown, no explanations.',
            "Create a safe component for this request: {$prompt}",
            1200
        );
    }

    /**
     * AI Agent for Business Strategy (CEO Alex)
     */
    public function askCeoAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'CEO Alex', 'You are Alex, CEO of Mercasto, a Mexico-wide marketplace. Reply in Russian with strategic, concrete, production-focused advice.');
    }

    public function askLawyerAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'Lawyer AI', 'You are a Mexico-focused marketplace legal risk assistant. Reply in Russian. Give practical compliance steps, but state this is not legal advice and final review needs a licensed lawyer.');
    }

    public function askNotaryAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'Notary AI', 'You are a Mexico-focused notary workflow assistant for marketplace documents, identity checks, and transaction evidence. Reply in Russian. Do not claim to replace a real notary.');
    }

    public function askAdvocateAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'Advocate AI', 'You are a consumer-protection and dispute-resolution assistant for Mercasto. Reply in Russian with safe escalation steps, evidence checklists, and risk controls.');
    }

    /**
     * AI Agent for Marketing (CMO)
     */
    public function askMarketingAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'Marketing AI', 'You are CMO of Mercasto. Reply in Russian with acquisition, SEO, retention, conversion, and ad-marketplace growth tactics for Mexico.');
    }

    /**
     * AI Agent for SEO
     */
    public function askSeoAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'SEO AI', 'You are lead SEO/AEO specialist for Mercasto Mexico. Reply in Russian with technical SEO, schema, city/category landing pages, indexation, and content recommendations.');
    }

    /**
     * AI Agent for Chief UI Officer
     */
    public function askCeoUiAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'CEO UI AI', 'You are Chief UI Officer for Mercasto. Reply in Russian with visual design, typography, color, spacing, component styling, and dark/light mode guidance.');
    }

    /**
     * AI Agent for Chief UX Officer
     */
    public function askCeoUxAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'CEO UX AI', 'You are Chief UX Officer for Mercasto. Reply in Russian with user flows, mobile usability, accessibility, conversion friction, and marketplace trust improvements.');
    }

    /**
     * AI Agent for UI Developer
     */
    public function askUiAgent(Request $request)
    {
        return $this->roleAgentResponse($request, 'UI Developer AI', 'You are a senior UI developer for Mercasto React/Tailwind. Reply in Russian with concrete CSS/JSX implementation steps and safe code suggestions.');
    }

    private function safeAgentSelectSql(string $sql): string
    {
        $sql = trim(str_replace(['```sql', '```', '`'], '', $sql));
        $sql = trim(preg_replace('/\s+/', ' ', $sql) ?? $sql);
        $sql = rtrim($sql, " \t\n\r\0\x0B;");

        if (! preg_match('/^\s*select\s/i', $sql)) {
            throw new \RuntimeException('Solo se permiten consultas SELECT por seguridad.');
        }

        if (preg_match('/(;|--|\/\*|\*\/)/', $sql)) {
            throw new \RuntimeException('La consulta contiene sintaxis no permitida.');
        }

        $blockedKeywords = 'insert|update|delete|drop|alter|truncate|grant|revoke|copy|create|replace|execute|call|do|listen|notify|vacuum|analyze|attach|detach';
        if (preg_match('/\b(' . $blockedKeywords . ')\b/i', $sql)) {
            throw new \RuntimeException('La consulta generada no es de solo lectura.');
        }

        $blockedFields = 'email|password|token|secret|phone|two_factor|remember_token|pending_email|api_key|webhook|clip|payment';
        if (preg_match('/\b(' . $blockedFields . ')\b/i', $sql)) {
            throw new \RuntimeException('La consulta intenta leer campos sensibles.');
        }

        preg_match_all('/\b(?:from|join)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/i', $sql, $matches);
        $tables = $matches[1] ?? [];
        if ($tables === []) {
            throw new \RuntimeException('La consulta debe leer una tabla permitida.');
        }

        $allowedTables = ['ads', 'users', 'ad_clicks'];
        foreach ($tables as $table) {
            $table = strtolower((string) Str::of($table)->afterLast('.'));
            if (! in_array($table, $allowedTables, true)) {
                throw new \RuntimeException('La consulta usa una tabla no permitida.');
            }
        }

        if (preg_match('/\b(pg_|pg_catalog|information_schema|sqlite_|mysql)\b/i', $sql)) {
            throw new \RuntimeException('La consulta intenta leer metadatos internos.');
        }

        if (preg_match('/\blimit\s+(\d+)\b/i', $sql, $limit) && (int) $limit[1] > 100) {
            throw new \RuntimeException('El límite máximo permitido es 100 filas.');
        }

        if (! preg_match('/\blimit\s+\d+\b/i', $sql)) {
            $sql .= ' LIMIT 50';
        }

        return $sql;
    }

    private function runAgentSelect(string $sql): array
    {
        return DB::transaction(function () use ($sql) {
            if (DB::getDriverName() === 'pgsql') {
                DB::statement("SET LOCAL statement_timeout = '3000ms'");
            }

            return DB::select($sql);
        });
    }

    private function roleAgentResponse(Request $request, string $agent, string $system)
    {
        if ($denied = $this->denyNonAdmin($request)) return $denied;
        $request->validate(['query' => 'required|string|max:1500']);

        return $this->agentTextResponse($agent, $system, (string) $request->input('query'), 900);
    }

    private function agentTextResponse(string $agent, string $system, string $prompt, int $maxTokens = 900)
    {
        try {
            $text = $this->askAiText($system, $prompt, $maxTokens);

            return response()->json([
                'agent' => $agent,
                'response' => $this->cleanAiOutput($text),
                'status' => 'success',
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Admin AI agent failed', [
                'agent' => $agent,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'agent' => $agent,
                'error' => 'AI no está disponible en este momento. Inténtalo de nuevo.',
            ], 503);
        }
    }

    private function askAiText(string $system, string $prompt, int $maxTokens): string
    {
        /** @var \App\Services\DeepSeekClient $client */
        $client = app(\App\Services\DeepSeekClient::class);
        $result = $client->chatFlash(
            [
                ['role' => 'system', 'content' => $system],
                ['role' => 'user', 'content' => $prompt],
            ],
            [
                'max_tokens' => $maxTokens,
                'temperature' => 0.2,
                'timeout' => 45,
                'thinking' => 'disabled',
            ]
        );

        $text = trim((string) ($result['choices'][0]['message']['content'] ?? ''));
        if ($text === '') {
            throw new \RuntimeException('AI returned empty response.');
        }

        return $text;
    }

    private function cleanAiOutput(string $text): string
    {
        return trim(str_replace(['```markdown', '```jsx', '```react', '```sql', '```', 'javascriptreact'], '', $text));
    }

    private function denyNonAdmin(Request $request)
    {
        if (! $request->user() || $request->user()->role !== 'admin') {
            return response()->json(['message' => 'Acceso denegado'], 403);
        }

        return null;
    }

    /**
     * Pause an active ad (owner only)
     */
    public function pause(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        if ($request->user()->id !== $ad->user_id) {
            return response()->json(['message' => 'No tienes permisos para pausar este anuncio'], 403);
        }
        if ($ad->status !== 'active') {
            return response()->json(['message' => 'Solo puedes pausar anuncios activos'], 422);
        }

        $ad->status = 'paused';
        $ad->save();

        Cache::forget("ad_{$id}");
        Cache::forget('sitemap_xml');
        for ($i = 1; $i <= 10; $i++) { Cache::forget("ads_index_page_{$i}"); }

        return response()->json($ad->fresh('user'));
    }

    /**
     * Reactivate a paused ad (owner only)
     */
    public function activate(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        if ($request->user()->id !== $ad->user_id) {
            return response()->json(['message' => 'No tienes permisos para reactivar este anuncio'], 403);
        }
        if ($ad->status !== 'paused') {
            return response()->json(['message' => 'Solo puedes reactivar anuncios pausados'], 422);
        }

        $ad->status = 'active';
        $ad->save();

        Cache::forget("ad_{$id}");
        Cache::forget('sitemap_xml');
        for ($i = 1; $i <= 10; $i++) { Cache::forget("ads_index_page_{$i}"); }

        return response()->json($ad->fresh('user'));
    }

    /**
     * Republish an expired ad (free tier: max 3 times)
     */
    public function republish(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        if ($request->user()->id !== $ad->user_id) {
            return response()->json(['message' => 'No tienes permisos para republicar este anuncio'], 403);
        }
        if ($ad->status !== 'expired') {
            return response()->json(['message' => 'Solo puedes republicar anuncios expirados'], 422);
        }

        $maxRepublishes = $request->user()->role === 'admin' ? 100 : min($this->monthlyAdLimit($request->user()), 100);
        if ($ad->republish_count >= $maxRepublishes) {
            return response()->json([
                'message' => 'Has alcanzado el límite de republicaciones gratuitas. Crea un nuevo anuncio o actualiza a PRO.',
                'republish_count' => $ad->republish_count,
                'max' => $maxRepublishes
            ], 402);
        }

        $ad->update([
            'status' => 'active',
            'expires_at' => now()->addDays(30),
            'republish_count' => $ad->republish_count + 1,
            'republished_at' => now(),
        ]);

        Cache::forget("ad_{$id}");
        Cache::forget('sitemap_xml');
        for ($i = 1; $i <= 10; $i++) { Cache::forget("ads_index_page_{$i}"); }

        return response()->json($ad->fresh('user'));
    }

    /**
     * Get full ad data for editing (owner or admin only, any status)
     */
    public function editForm(Request $request, $id)
    {
        $ad = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)->findOrFail($id);

        $user = $request->user();
        if ($user->id !== $ad->user_id && $user->role !== 'admin') {
            return response()->json(['message' => 'No tienes permisos para editar este anuncio'], 403);
        }

        return response()->json($ad);
    }


    /**
     * Bulk action: pause, activate, or delete multiple ads (owner only)
     * Rate limited to 10 requests/minute via route middleware
     */
    public function bulkAction(Request $request)
    {
        $validated = $request->validate([
            'action' => 'required|in:pause,activate,delete',
            'ad_ids' => 'required|array|min:1|max:100',
            'ad_ids.*' => 'integer|min:1',
        ]);

        $userId = $request->user()->id;
        $adIds  = array_unique($validated['ad_ids']);
        $action = $validated['action'];

        // Security: ensure every requested ad belongs to this user
        $ownedCount = Ad::whereIn('id', $adIds)->where('user_id', $userId)->count();
        if ($ownedCount !== count($adIds)) {
            return response()->json(['message' => 'No tienes permisos para modificar uno o más de estos anuncios'], 403);
        }

        if ($action === 'pause') {
            Ad::whereIn('id', $adIds)->where('user_id', $userId)
               ->where('status', 'active')
               ->update(['status' => 'paused', 'updated_at' => now()]);

        } elseif ($action === 'activate') {
            Ad::whereIn('id', $adIds)->where('user_id', $userId)
               ->whereIn('status', ['paused', 'inactive'])
               ->update(['status' => 'active', 'updated_at' => now()]);

        } elseif ($action === 'delete') {
            // Mirror destroy() cleanup for multiple ads
            try {
                $ads = Ad::whereIn('id', $adIds)->where('user_id', $userId)->get();
                foreach ($ads as $ad) {
                    if ($ad->image_url) {
                        $images = json_decode($ad->image_url, true);
                        if (is_array($images)) {
                            Storage::disk('public')->delete($images);
                        } elseif (is_string($images)) {
                            Storage::disk('public')->delete($images);
                        }
                    }
                    if ($ad->video_url) {
                        Storage::disk('public')->delete($ad->video_url);
                    }
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Bulk Delete S3 Error: ' . $e->getMessage());
            }
            DB::table('favorites')->whereIn('ad_id', $adIds)->delete();
            DB::table('ad_views')->whereIn('ad_id', $adIds)->delete();
            DB::table('ad_clicks')->whereIn('ad_id', $adIds)->delete();
            DB::table('ad_impressions')->whereIn('ad_id', $adIds)->delete();
            DB::table('reports')->whereIn('ad_id', $adIds)->delete();
            DB::table('payments')->whereIn('ad_id', $adIds)->update(['ad_id' => null]);
            Ad::whereIn('id', $adIds)->where('user_id', $userId)->delete();
        }

        // Bust caches
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }
        foreach ($adIds as $id) {
            Cache::forget("ad_{$id}");
        }

        return response()->json([
            'success'  => true,
            'affected' => count($adIds),
            'action'   => $action,
        ]);
    }

    /**
     * Похожие объявления через pgvector (косинусное сходство)
     */
    public function similar(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        // Если вектора нет — fallback на ту же категорию
        if (!$ad->embedding) {
            $fallback = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
                ->where('status', 'active')
                ->where('category', $ad->category)
                ->where('id', '!=', $ad->id)
                ->latest()
                ->limit(8)
                ->get();
            return response()->json($fallback);
        }

        $embeddingString = $ad->embedding;

        // pgvector: сортировка по косинусному расстоянию (<=>)
        $similar = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
            ->selectRaw("*, (embedding <=> ?) AS vec_distance", [$embeddingString])
            ->where('status', 'active')
            ->where('id', '!=', $ad->id)
            ->whereNotNull('embedding')
            ->orderBy('vec_distance')
            ->limit(8)
            ->get();

        // Если pgvector вернул меньше 4 — дополняем той же категорией
        if ($similar->count() < 4) {
            $extra = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
                ->where('status', 'active')
                ->where('category', $ad->category)
                ->where('id', '!=', $ad->id)
                ->whereNotIn('id', $similar->pluck('id'))
                ->latest()
                ->limit(8 - $similar->count())
                ->get();
            $similar = $similar->merge($extra);
        }

        return response()->json($similar->values());
    }



    /**
     * GET /api/ads/{id}/price-history
     * Returns the last 10 price changes for an ad (public endpoint)
     */
    public function priceHistory(Request $request, $id)
    {
        $history = DB::table('price_history')
            ->where('ad_id', $id)
            ->orderBy('changed_at', 'desc')
            ->limit(10)
            ->get(['old_price', 'new_price', 'changed_at']);

        return response()->json([
            'ad_id'   => (int) $id,
            'history' => $history->reverse()->values(),
        ]);
    }

    /**
     * PUT /api/ads/{id}/renew
     * Renew an ad's expiry by 30 days from now.
     * - Free if the ad is still active (not expired).
     * - Costs 1 referral_credit if the ad has already expired.
     * Clears reminder_sent_at so reminders can fire again next cycle.
     */
    public function renew(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        if ($request->user()->id !== $ad->user_id) {
            return response()->json(['message' => 'No tienes permisos para renovar este anuncio'], 403);
        }

        $user        = $request->user();
        $wasExpired  = $ad->status === 'expired';

        if ($wasExpired) {
            if ($user->referral_credits < 1) {
                return response()->json([
                    'message'          => 'Necesitas créditos para republicar este anuncio.',
                    'credits_remaining' => $user->referral_credits,
                ], 402);
            }
            $user->decrement('referral_credits');
        }

        $ad->update([
            'status'          => 'active',
            'expires_at'      => now()->addDays(30),
            'reminder_sent_at' => null,
        ]);

        Cache::forget("ad_{$id}");
        Cache::forget('sitemap_xml');
        for ($i = 1; $i <= 10; $i++) {
            Cache::forget("ads_index_page_{$i}");
        }

        return response()->json([
            'ok'               => true,
            'expires_at'       => $ad->fresh()->expires_at,
            'credits_remaining' => $user->fresh()->referral_credits,
        ]);
    }

    private function monthlyAdLimit($user): int
    {
        if ($user->role === 'admin') {
            return 999999;
        }

        if (
            $user->plan_code !== 'package_free'
            && $user->plan_expires_at
            && $user->plan_expires_at->isFuture()
        ) {
            return max(3, (int) $user->monthly_ad_limit);
        }

        return 3;
    }
}
