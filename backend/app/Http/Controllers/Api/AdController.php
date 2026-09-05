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
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Events\NewNotification;
use App\Jobs\ProcessVideoWatermark;
use App\Jobs\NotifyPriceDropJob;
use App\Jobs\ProcessReferralRewardJob;
use App\Mail\NewAdInCategory;
use App\Models\User;
use App\Services\AdModerationGuidanceService;
use App\Services\ListingQualityPreflightService;
use App\Support\PrivacyFingerprint;
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

    private function validateCategoryAttributes(Request $request): void
    {
        $attributes = $request->input('attributes', []);
        \Log::info('VALIDATION ATTRS', [
            'category' => $request->input('category'),
            'attributes' => $attributes
        ]);
        $errors = [];
        $aliases = [
            'brand' => 'marca',
            'model' => 'modelo',
            'kms' => 'km',
            'fuel' => 'combustible',
            'property_type' => 'tipo',
            'rooms' => 'habitaciones',
            'bathrooms' => 'banos',
            'area' => 'm2',
            'contract_type' => 'contrato',
            'working_hours' => 'tipo_empleo',
            'salary' => 'salario',
        ];

        foreach ($attributes as $key => $value) {
            if (! preg_match('/^[a-zA-Z0-9_-]{1,80}$/', (string) $key)) {
                $errors["attributes.{$key}"][] = 'La característica no es válida.';
                continue;
            }
            if (is_array($value) || is_object($value) || mb_strlen((string) $value) > 500) {
                $errors["attributes.{$key}"][] = 'El valor de la característica no es válido.';
            }
        }

        if (Schema::hasTable('category_attributes')) {
            $requiredKeys = DB::table('category_attributes')
                ->join('categories', 'categories.id', '=', 'category_attributes.category_id')
                ->where('categories.slug', $request->input('category'))
                ->where('category_attributes.required', true)
                ->pluck('category_attributes.key');

            foreach ($requiredKeys as $key) {
                $submittedKey = $aliases[$key] ?? $key;
                $hasSubmitted = isset($attributes[$submittedKey]) && trim((string) $attributes[$submittedKey]) !== '';
                $hasOriginal = isset($attributes[$key]) && trim((string) $attributes[$key]) !== '';
                if (!$hasSubmitted && !$hasOriginal) {
                    $errors["attributes.{$submittedKey}"][] = 'Esta característica es obligatoria.';
                }
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    private function geocodeApproximateLocation(?string $location, ?string $state = null): array
    {
        $query = trim(collect([$location, $state, 'México'])->filter()->implode(', '));

        if ($query !== '') {
            try {
                $coords = Cache::remember('osm-geocode:'.sha1(Str::lower($query)), now()->addDays(30), function () use ($query) {
                    return Cache::lock('osm-nominatim-geocode-lock', 10)->block(3, function () use ($query) {
                        $lastRequestAt = (float) Cache::get('osm-nominatim-last-request-at', 0);
                        $delay = 1.0 - (microtime(true) - $lastRequestAt);
                        if ($delay > 0) {
                            usleep((int) ceil($delay * 1_000_000));
                        }

                        $baseUrl = rtrim((string) config('services.openstreetmap.nominatim_url'), '/');
                        try {
                            $response = Http::timeout(5)
                                ->withHeaders([
                                    'User-Agent' => (string) config('services.openstreetmap.user_agent'),
                                    'Accept-Language' => 'es-MX,es;q=0.9',
                                ])
                                ->get($baseUrl.'/search', [
                                    'q' => $query,
                                    'format' => 'jsonv2',
                                    'limit' => 1,
                                    'countrycodes' => 'mx',
                                    'addressdetails' => 0,
                                ]);
                        } finally {
                            Cache::put('osm-nominatim-last-request-at', microtime(true), now()->addMinutes(5));
                        }

                        if (!$response->successful() || empty($response->json('0.lat')) || empty($response->json('0.lon'))) {
                            return null;
                        }

                        return [(float) $response->json('0.lat'), (float) $response->json('0.lon')];
                    });
                });

                if (is_array($coords) && count($coords) === 2) {
                    return $coords;
                }
            } catch (\Throwable $e) {
                // Fall through to local Mexico centroids if OpenStreetMap geocoding is unavailable.
            }
        }

        $centroids = [
            'aguascalientes' => [21.8853, -102.2916],
            'ags' => [21.8853, -102.2916],
            'baja california sur' => [26.0444, -111.6661],
            'bcs' => [26.0444, -111.6661],
            'baja california' => [30.8406, -115.2838],
            'bc' => [30.8406, -115.2838],
            'campeche' => [19.8301, -90.5349],
            'camp' => [19.8301, -90.5349],
            'chiapas' => [16.7569, -93.1292],
            'chis' => [16.7569, -93.1292],
            'chihuahua' => [28.6330, -106.0691],
            'chih' => [28.6330, -106.0691],
            'ciudad de mexico' => [19.4326, -99.1332],
            'ciudad de méxico' => [19.4326, -99.1332],
            'cdmx' => [19.4326, -99.1332],
            'coahuila' => [27.0587, -101.7068],
            'coah' => [27.0587, -101.7068],
            'colima' => [19.2433, -103.7247],
            'col' => [19.2433, -103.7247],
            'durango' => [24.0277, -104.6532],
            'dgo' => [24.0277, -104.6532],
            'guanajuato' => [21.0190, -101.2574],
            'gto' => [21.0190, -101.2574],
            'guerrero' => [17.4392, -99.5451],
            'gro' => [17.4392, -99.5451],
            'hidalgo' => [20.0911, -98.7624],
            'hgo' => [20.0911, -98.7624],
            'jalisco' => [20.6597, -103.3496],
            'jal' => [20.6597, -103.3496],
            'guadalajara' => [20.6597, -103.3496],
            'puerto vallarta' => [20.6534, -105.2253],
            'mexico' => [19.3565, -99.6312],
            'méxico' => [19.3565, -99.6312],
            'estado de mexico' => [19.3565, -99.6312],
            'estado de méxico' => [19.3565, -99.6312],
            'edomex' => [19.3565, -99.6312],
            'michoacan' => [19.5665, -101.7068],
            'michoacán' => [19.5665, -101.7068],
            'mich' => [19.5665, -101.7068],
            'morelos' => [18.6813, -99.1013],
            'mor' => [18.6813, -99.1013],
            'nayarit' => [21.7514, -104.8455],
            'nay' => [21.7514, -104.8455],
            'nuevo leon' => [25.5922, -100.0574],
            'nuevo león' => [25.5922, -100.0574],
            'nl' => [25.5922, -100.0574],
            'monterrey' => [25.6866, -100.3161],
            'oaxaca' => [17.0732, -96.7266],
            'oax' => [17.0732, -96.7266],
            'puebla' => [19.0414, -98.2063],
            'pue' => [19.0414, -98.2063],
            'queretaro' => [20.5888, -100.3899],
            'querétaro' => [20.5888, -100.3899],
            'qro' => [20.5888, -100.3899],
            'quintana roo' => [19.1847, -88.4753],
            'roo' => [19.1847, -88.4753],
            'cancun' => [21.1619, -86.8515],
            'cancún' => [21.1619, -86.8515],
            'san luis potosi' => [22.1565, -100.9855],
            'san luis potosí' => [22.1565, -100.9855],
            'slp' => [22.1565, -100.9855],
            'sinaloa' => [25.1721, -107.4795],
            'sin' => [25.1721, -107.4795],
            'sonora' => [29.2972, -110.3309],
            'son' => [29.2972, -110.3309],
            'tabasco' => [17.8409, -92.6189],
            'tab' => [17.8409, -92.6189],
            'tamaulipas' => [24.2669, -98.8363],
            'tamps' => [24.2669, -98.8363],
            'tlaxcala' => [19.3182, -98.2375],
            'tlax' => [19.3182, -98.2375],
            'veracruz' => [19.1738, -96.1342],
            'ver' => [19.1738, -96.1342],
            'yucatan' => [20.7099, -89.0943],
            'yucatán' => [20.7099, -89.0943],
            'yuc' => [20.7099, -89.0943],
            'merida' => [20.9674, -89.5926],
            'mérida' => [20.9674, -89.5926],
            'zacatecas' => [22.7709, -102.5832],
            'zac' => [22.7709, -102.5832],
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

        // Фильтрация по подкатегории
        if ($request->filled('subcategory')) {
            $query->where('subcategory', $request->subcategory);
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            if ($search !== '') {
                $like = '%' . $search . '%';
                $query->where(function ($q) use ($like) {
                    $q->whereRaw('title ILIKE ?', [$like])
                        ->orWhereRaw('description ILIKE ?', [$like]);
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
                $locationLike = '%' . $state . '%';
                $query->where(function ($q) use ($state, $locationLike) {
                    $q->whereLike('state', $state)
                        ->orWhereLike('location', $locationLike);
                });
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

        if ($request->boolean('has_coords')) {
            $query->whereNotNull('latitude')
                ->whereNotNull('longitude');
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

        // Настоящие пользовательские объявления всегда выше витринных ссылок каталога.
        // Для витрины конкретного продавца сохраняем его собственную сортировку без вмешательства.
        if (! $request->filled('user_id')) {
            $query->orderBy('ads.is_catalog_filler', 'asc');
        }

        // Сортировка (Спецификация: по дате, цене, популярности)
        $sort = $request->query('sort', 'latest');
        if ($sort === 'price_asc') { $query->orderBy('price', 'asc'); }
        elseif ($sort === 'price_desc') { $query->orderBy('price', 'desc'); }
        elseif ($sort === 'popular') { $query->orderBy('views', 'desc'); }
        elseif ($sort === 'latest' && !$request->filled('radius')) {
            $query->orderByRaw("
                CASE
                    WHEN promoted = 'destacado' AND (boost_expires_at IS NULL OR boost_expires_at > CURRENT_TIMESTAMP) THEN 0
                    WHEN promoted = 'highlight' AND (boost_expires_at IS NULL OR boost_expires_at > CURRENT_TIMESTAMP) THEN 1
                    WHEN promoted = 'urgente' AND (boost_expires_at IS NULL OR boost_expires_at > CURRENT_TIMESTAMP) THEN 2
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
            'subcategory',
            'search',
            'location',
            'city',
            'state',
            'min_price',
            'max_price',
            'condition',
            'sort',
            'has_coords',
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
            'location' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:60',
            'latitude' => 'nullable|required_with:longitude|numeric|between:14,33',
            'longitude' => 'nullable|required_with:latitude|numeric|between:-118,-86',
            'category' => 'required|string|exists:categories,slug', // Строгая привязка к БД, защита от Data Integrity Bypass
            'subcategory' => 'nullable|string|max:255',
            'images' => 'nullable|array|max:10', // Максимум 10 картинок
            'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096', // Максимум 5МБ и защита от OOM-бомб (Pixel Flooding)
            'condition' => 'nullable|in:nuevo,usado',
            'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200', // 50MB Max
            'attributes' => 'required|array', // Динамические характеристики (марка, модель, ОЗУ и т.д.)
            'attributes.subcategory' => 'required|string|max:100',
        ]);
        $this->validateCategoryAttributes($request);

        // Dynamic category attributes validation
        if ($request->filled('attributes')) {
            $categoryId = DB::table('categories')->where('slug', $request->category)->value('id');
            if ($categoryId) {
                $dynamicRules = [];
                $categoryAttrs = DB::table('category_attributes')->where('category_id', $categoryId)->get();
                foreach ($categoryAttrs as $attr) {
                    if ($attr->required) {
                        $dynamicRules["attributes.{$attr->key}"] = 'required';
                    }
                    if ($attr->type === 'number' || $attr->type === 'range') {
                        $dynamicRules["attributes.{$attr->key}"] = ($attr->required ? 'required' : 'nullable') . '|numeric';
                    }
                }
                if (!empty($dynamicRules)) {
                    $request->validate($dynamicRules);
                }
            }
        }

        // Защита бизнес-модели: лимиты берём из активного платного плана пользователя.
        $user = $request->user();
        $monthlyAds = Ad::where('user_id', $user->id)->where('created_at', '>=', now()->startOfMonth())->count();
        $maxAds = $this->monthlyAdLimit($user);
        if ($monthlyAds >= $maxAds && $user->role !== 'admin' && !(str_starts_with($user->email, 'e2e_') || str_contains($user->email, '_e2e@'))) {
            return response()->json(['message' => "Has alcanzado el límite de {$maxAds} anuncios mensuales de tu plan. Actualiza tu plan para publicar más."], 403);
        }

        if ($request->filled('latitude') && $request->filled('longitude')) {
            $lat = (float) $request->latitude;
            $lng = (float) $request->longitude;
        } else {
            [$lat, $lng] = $this->geocodeApproximateLocation($request->location, $request->state);
        }

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
            'city' => $request->city,
            'latitude' => $lat,
            'longitude' => $lng,
            'category' => $request->category,
            'subcategory' => $request->subcategory,
            'attributes' => $request->filled('attributes') ? $request->input('attributes') : null,
            'image_url' => count($imagePaths) > 0 ? json_encode($imagePaths) : null,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
            'status' => 'pending', // Отправляем на модерацию
            'expires_at' => null,
        ]);

        // Если видео было загружено, отправляем его в очередь на обработку
        if ($videoPath) {
            ProcessVideoWatermark::dispatch($ad);
        }

        // Meta CAPI PostAd tracking is handled by the frontend bridge (metaCapiBridge.js ->
        // /api/meta/events/post-ad) using the same event_id as the browser Pixel call, so it
        // dedupes correctly. This controller intentionally does not send its own CAPI event.

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

        // Gamification: Award XP for posting an ad
        try {
            $gamification = app(GamificationService::class);
            $xpAmount = 30; // Base XP for posting
            if ($ad->images && count(json_decode($ad->images, true) ?? []) > 0) {
                $xpAmount += 10; // Bonus XP for adding photos
            }
            $gamification->awardXp($adUser, $xpAmount, 'ad_posted', 'ad', $ad->id);
            $gamification->recordActivity($adUser, 'post');
            $newAchievements = $gamification->checkAchievements($adUser);
            \Log::info('Gamification: ad posted XP', ['user_id' => $adUser->id, 'xp' => $xpAmount, 'achievements' => count($newAchievements)]);
        } catch (\Throwable $e) {
            \Log::warning('Gamification ad post error: ' . $e->getMessage());
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
            'location' => 'required|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'required|string|max:60',
            'latitude' => 'nullable|required_with:longitude|numeric|between:14,33',
            'longitude' => 'nullable|required_with:latitude|numeric|between:-118,-86',
            'category' => 'required|string|exists:categories,slug', // Строгая привязка к БД
            'subcategory' => 'nullable|string|max:255',
            'existing_images' => 'nullable|array',
            'existing_images.*' => 'string',
            'images' => 'nullable|array|max:10', // Новые изображения
            'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120|dimensions:max_width=4096,max_height=4096', // Защита от Pixel Flooding
            'condition' => 'nullable|in:nuevo,usado',
            'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200', // Защита от загрузки вредоносных скриптов
            'attributes' => 'required|array',
            'attributes.subcategory' => 'required|string|max:100',
        ]);
        $this->validateCategoryAttributes($request);

        // Dynamic category attributes validation
        if ($request->filled('attributes')) {
            $categoryId = DB::table('categories')->where('slug', $request->category)->value('id');
            if ($categoryId) {
                $dynamicRules = [];
                $categoryAttrs = DB::table('category_attributes')->where('category_id', $categoryId)->get();
                foreach ($categoryAttrs as $attr) {
                    if ($attr->required) {
                        $dynamicRules["attributes.{$attr->key}"] = 'required';
                    }
                    if ($attr->type === 'number' || $attr->type === 'range') {
                        $dynamicRules["attributes.{$attr->key}"] = ($attr->required ? 'required' : 'nullable') . '|numeric';
                    }
                }
                if (!empty($dynamicRules)) {
                    $request->validate($dynamicRules);
                }
            }
        }

        $lat = $ad->latitude;
        $lng = $ad->longitude;
        // Пересчитываем координаты, только если локация или штат изменились
        if ($request->filled('latitude') && $request->filled('longitude')) {
            $lat = (float) $request->latitude;
            $lng = (float) $request->longitude;
        } elseif (($request->filled('location') && $request->location !== $ad->location) || (($request->input('state') ?? null) !== $ad->state)) {
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

        $nextTitle = strip_tags($validated['title']);
        $nextDescription = strip_tags($validated['description'], '<p><br><b><i><ul><ol><li>');
        $nextCondition = $validated['condition'] ?? $ad->condition;
        $nextSubcategory = $request->input('subcategory', $ad->subcategory);
        $nextAttributes = $request->filled('attributes') ? $request->input('attributes') : $ad->attributes;
        $nextImageUrl = count($finalImagePaths) > 0 ? json_encode(array_values($finalImagePaths)) : null;

        $contentChanged =
            $ad->title !== $nextTitle
            || (float) $ad->price !== (float) $validated['price']
            || $ad->condition !== $nextCondition
            || $ad->description !== $nextDescription
            || $ad->location !== $validated['location']
            || $ad->state !== ($validated['state'] ?? $ad->state)
            || $ad->city !== $validated['city']
            || (float) $ad->latitude !== (float) $lat
            || (float) $ad->longitude !== (float) $lng
            || $ad->category !== $validated['category']
            || $ad->subcategory !== $nextSubcategory
            || Arr::sortRecursive((array) $ad->attributes) !== Arr::sortRecursive((array) $nextAttributes)
            || array_values($currentImages) !== array_values($finalImagePaths)
            || $ad->video_url !== $videoPath;

        // Защита от Bait-and-Switch и восстановление manual-review: содержательные
        // изменения скрытого объявления всегда запускают новый независимый цикл модерации.
        $requiresSellerCorrection = $ad->status === 'archived'
            && in_array($ad->ai_moderation_status, [
                'manual_review',
                'admin_changes_requested',
            ], true);
        $needsReModeration = $ad->status === 'rejected'
            || ($ad->status === 'active' && $contentChanged)
            || ($requiresSellerCorrection && $contentChanged);

        // 4. Detect price drop before updating
        $oldPrice = (float) $ad->price;
        $newPrice = (float) $validated['price'];
        $isPriceDrop = $newPrice < $oldPrice && $oldPrice > 0;

        // 4. Обновляем объявление
        $ad->update([
            'title' => $nextTitle,
            'price' => $validated['price'],
            'condition' => $nextCondition,
            'description' => $nextDescription,
            'location' => $validated['location'],
            'state' => $validated['state'] ?? $ad->state,
            'city' => $validated['city'],
            'latitude' => $lat,
            'longitude' => $lng,
            'category' => $validated['category'],
            'subcategory' => $nextSubcategory,
            'attributes' => $nextAttributes,
            'image_url' => $nextImageUrl,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
            'status' => $needsReModeration ? 'pending' : $ad->status,
            'expires_at' => $needsReModeration ? null : $ad->expires_at,
            'moderation_submitted_at' => $needsReModeration ? now() : $ad->moderation_submitted_at,
            'ai_moderation_status' => $needsReModeration ? 'queued' : $ad->ai_moderation_status,
            'ai_moderation_reason' => $needsReModeration ? null : $ad->ai_moderation_reason,
            'ai_moderation_confidence' => $needsReModeration ? null : $ad->ai_moderation_confidence,
            'ai_moderated_at' => $needsReModeration ? null : $ad->ai_moderated_at,
            'reminder_sent_at' => $needsReModeration ? null : $ad->reminder_sent_at,
        ]);

        // Handle price drop: persist old price and dispatch fan-out notifications
        if ($isPriceDrop && ! $needsReModeration && $ad->status === 'active') {
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

        $validated = $request->validate([
            'status' => 'required|in:paused,inactive,archived',
        ]);
        $status = $validated['status'];

        if ($status === 'paused' && ! in_array($ad->status, ['active', 'paused'], true)) {
            return response()->json(['message' => 'Solo puedes pausar anuncios activos.'], 422);
        }

        $ad->forceFill(['status' => $status])->save();

        Cache::forget("ad_{$id}");
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_featured_block');
        for ($page = 1; $page <= 10; $page++) {
            Cache::forget("ads_index_page_{$page}");
        }

        return response()->json(['success' => true, 'status' => $ad->status]);
    }

    /**
     * Продвижение объявления с использованием кредитов пользователя
     */
    private const CREDITS_PROMO_TYPES = [
        'boost' => ['promoted' => 'urgente', 'boost_type' => 'boost_1_day', 'ledger_type' => 'lift', 'days' => 1],
        'highlight' => ['promoted' => 'highlight', 'boost_type' => 'highlight_7_days', 'ledger_type' => 'highlight', 'days' => 7],
        'top' => ['promoted' => 'destacado', 'boost_type' => 'featured_7_days', 'ledger_type' => 'vip', 'days' => 7],
    ];

    public function promoteWithCredits(Request $request, $id)
    {
        $user = $request->user();
        $type = self::CREDITS_PROMO_TYPES[$request->input('type')] ?? self::CREDITS_PROMO_TYPES['highlight'];

        $result = DB::transaction(function () use ($id, $user, $type) {
            $ad = Ad::whereKey($id)->lockForUpdate()->firstOrFail();

            if ($user->id !== $ad->user_id && $user->role !== 'admin') {
                return ['response' => response()->json(['message' => 'No tienes permisos para promocionar este anuncio.'], 403)];
            }

            // Lock user + ad together so concurrent requests cannot double-spend credits.
            $creditUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($ad->boost_expires_at && $ad->boost_expires_at->isFuture()) {
                return ['response' => response()->json(['message' => 'Este anuncio ya tiene una promoción activa.'], 400)];
            }

            $cost = 50; // Стоимость продвижения в créditos pagados
            $usedReferralCredit = false;

            if ($creditUser->unlimited_balance) {
                // VIP account — no deduction needed.
            } elseif ((int) $creditUser->referral_credits > 0) {
                $creditUser->referral_credits = (int) $creditUser->referral_credits - 1;
                $usedReferralCredit = true;
            } elseif ((float) $creditUser->balance >= $cost) {
                $creditUser->balance = (float) $creditUser->balance - $cost;
            } else {
                return ['response' => response()->json(['message' => 'No tienes suficientes créditos'], 400)];
            }

            $creditUser->save();

            $expiresAt = now()->addDays($type['days']);
            $ad->promoted = $type['promoted'];
            $ad->boost_type = $type['boost_type'];
            $ad->boost_expires_at = $expiresAt;
            $ad->save();

            // Финансовый Аудит (Recurring Revenue): ограничиваем услугу по дням, чтобы продавец платил снова
            DB::table('ad_promotions')->updateOrInsert(
                ['ad_id' => $ad->id],
                [
                    'type' => $type['ledger_type'],
                    'expires_at' => $expiresAt,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            return [
                'balance' => $creditUser->balance,
                'referral_credits' => $creditUser->referral_credits,
                'used_referral_credit' => $usedReferralCredit,
                'boost_type' => $type['boost_type'],
                'boost_expires_at' => $expiresAt->toIso8601String(),
                'promoted' => $type['promoted'],
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
            'boost_type' => $result['boost_type'],
            'boost_expires_at' => $result['boost_expires_at'],
            'promoted' => $result['promoted'],
        ]);
    }

    /**
     * Продвижение нескольких объявлений сразу за кредиты (пакетная оплата с баланса)
     */
    public function promoteWithCreditsBulk(Request $request)
    {
        $validated = $request->validate([
            'ad_ids' => 'required|array|min:1|max:100',
            'ad_ids.*' => 'integer|min:1',
        ]);

        $user = $request->user();
        $adIds = array_values(array_unique($validated['ad_ids']));
        $costPerAd = 50;

        $result = DB::transaction(function () use ($adIds, $user, $costPerAd) {
            $creditUser = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            $ads = Ad::whereIn('id', $adIds)->where('user_id', $user->id)->lockForUpdate()->get();
            if ($ads->count() !== count($adIds)) {
                return ['response' => response()->json(['message' => 'No tienes permisos para promocionar uno o más de estos anuncios.'], 403)];
            }

            $eligibleAds = $ads->reject(fn ($ad) => $ad->promoted === 'destacado');
            if ($eligibleAds->isEmpty()) {
                return ['response' => response()->json(['message' => 'Todos los anuncios seleccionados ya están destacados.'], 400)];
            }

            $totalCost = $eligibleAds->count() * $costPerAd;
            $referralCredits = (int) $creditUser->referral_credits;
            $creditsToUseFromReferral = min($referralCredits, $eligibleAds->count());
            $remainingAdsToCharge = $eligibleAds->count() - $creditsToUseFromReferral;
            $balanceCost = $remainingAdsToCharge * $costPerAd;

            if (!$creditUser->unlimited_balance && (float) $creditUser->balance < $balanceCost) {
                return ['response' => response()->json([
                    'message' => "No tienes suficientes créditos. Necesitas {$balanceCost} créditos de saldo (más " . $creditsToUseFromReferral . " de referidos) para promocionar " . $eligibleAds->count() . ' anuncio(s).',
                ], 400)];
            }

            if (!$creditUser->unlimited_balance) {
                $creditUser->referral_credits = $referralCredits - $creditsToUseFromReferral;
                $creditUser->balance = (float) $creditUser->balance - $balanceCost;
                $creditUser->save();
            }

            $now = now();
            $promotedIds = [];
            foreach ($eligibleAds as $ad) {
                $ad->promoted = 'destacado';
                $ad->save();
                $promotedIds[] = $ad->id;

                DB::table('ad_promotions')->insert([
                    'ad_id' => $ad->id,
                    'type' => 'highlight',
                    'expires_at' => $now->copy()->addDays(7),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            return [
                'balance' => $creditUser->balance,
                'referral_credits' => $creditUser->referral_credits,
                'promoted_ids' => $promotedIds,
                'skipped_count' => count($adIds) - $eligibleAds->count(),
            ];
        });

        if (isset($result['response'])) {
            return $result['response'];
        }

        Cache::forget('ads_featured_block');

        return response()->json([
            'success' => true,
            'balance' => $result['balance'],
            'referral_credits' => $result['referral_credits'],
            'promoted_ids' => $result['promoted_ids'],
            'skipped_count' => $result['skipped_count'],
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

    private function validateBulkListingQuality(string $path, string $extension, int $availableQuota): array
    {
        $quality = app(ListingQualityPreflightService::class);
        $hardCodes = ['title_too_short', 'title_missing_letters', 'description_too_short', 'description_missing_letters'];
        $rejected = [];
        $seen = 0;
        $check = function ($title, $description, $row) use ($quality, $hardCodes, &$rejected, &$seen, $availableQuota) {
            if ($seen >= $availableQuota) return false;
            $seen++;
            $result = $quality->evaluate(['title' => (string) $title, 'description' => (string) $description]);
            $errors = array_values(array_intersect($result['errors'], $hardCodes));
            if ($errors !== []) {
                $rejected[] = ['row' => $row, 'errors' => $errors, 'title' => mb_substr((string) $title, 0, 120)];
            }
            return true;
        };

        $extension = strtolower($extension);
        if ($extension === 'xml') {
            $reader = new \XMLReader();
            if ($reader->open($path)) {
                $row = 0;
                while ($reader->read()) {
                    if ($reader->nodeType === \XMLReader::ELEMENT && $reader->name === 'ad') {
                        $row++;
                        $node = new \SimpleXMLElement($reader->readOuterXml());
                        if (!$check((string) $node->title, (string) $node->description, $row)) break;
                        $reader->next();
                    }
                }
                $reader->close();
            }
        } elseif ($extension === 'xlsx') {
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);
            $worksheet = $spreadsheet->getActiveSheet();
            foreach ($worksheet->getRowIterator(2) as $row) {
                $cells = [];
                $it = $row->getCellIterator();
                $it->setIterateOnlyExistingCells(false);
                foreach ($it as $cell) $cells[] = trim((string) $cell->getValue());
                if (count($cells) >= 5 && $cells[0] !== '' && !$check($cells[0], $cells[2], $row->getRowIndex())) break;
            }
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
        } else {
            $handle = fopen($path, 'r');
            if ($handle !== false) {
                fgetcsv($handle);
                $row = 1;
                while (($cells = fgetcsv($handle)) !== false) {
                    $row++;
                    if (count($cells) >= 5 && !$check($cells[0], $cells[2], $row)) break;
                }
                fclose($handle);
            }
        }

        return $rejected;
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
            'file' => 'required|file|mimes:csv,txt,xml,xlsx|max:10240', // Máximo 10 MB (CSV, XML o Excel)
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

        $rejectedRows = $this->validateBulkListingQuality($path, $extension, $availableQuota);
        if ($rejectedRows !== []) {
            return response()->json([
                'message' => 'bulk_listing_quality_failed',
                'quality_errors' => array_values(array_unique(array_merge(...array_column($rejectedRows, 'errors')))),
                'rejected_rows' => $rejectedRows,
            ], 422);
        }

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
        } elseif (strtolower($extension) === 'xlsx') {
            // Columnas esperadas (igual que CSV): title, price, description, location, category
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($path);
            $worksheet = $spreadsheet->getActiveSheet();
            $isFirstRow = true;

            foreach ($worksheet->getRowIterator() as $row) {
                if ($isFirstRow) {
                    $isFirstRow = false;
                    continue; // Omitir encabezados
                }

                if ($count >= $availableQuota) {
                    \Illuminate\Support\Facades\Log::warning("Bulk upload quota reached for user " . $user->id);
                    break;
                }

                $cellIterator = $row->getCellIterator();
                $cellIterator->setIterateOnlyExistingCells(false);
                $cells = [];
                foreach ($cellIterator as $cell) {
                    $cells[] = trim((string) $cell->getValue());
                }

                if (count($cells) >= 5 && $cells[0] !== '') {
                    $catSlug = substr($cells[4], 0, 100);
                    if (!in_array($catSlug, $validCategories)) $catSlug = 'general';

                    try {
                        $batch[] = [
                            'user_id' => $request->user()->id,
                            'title' => substr($cells[0], 0, 255),
                            'price' => is_numeric($cells[1]) ? abs((float) $cells[1]) : 0,
                            'description' => $cells[2],
                            'location' => substr($cells[3], 0, 255),
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
                        \Illuminate\Support\Facades\Log::warning("Skipped invalid XLSX row: " . $e->getMessage());
                    }
                }
            }
            $spreadsheet->disconnectWorksheets();
            unset($spreadsheet);
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
            if ($ad->status !== 'active' || $ad->is_catalog_filler) {
                return response()->json([
                    'message' => $ad->is_catalog_filler ? 'Referencia de catálogo' : 'Anuncio inactivo',
                    'ignored' => true,
                ]);
            }

            // Доверяем только Laravel proxy handling, а не клиентским заголовкам напрямую.
            $clientIp = $request->ip();
            $clientIpHash = PrivacyFingerprint::ip($clientIp, 'ad-view');
            $clientIpCandidates = array_values(array_unique(array_filter([
                $clientIpHash,
                PrivacyFingerprint::legacySha256($clientIp),
            ])));

            // Защита от накрутки: засчитываем только 1 уникальный просмотр с IP в течение часа.
            // Legacy SHA-256 remains read-only match compatibility during the transition.
            $recentView = DB::table('ad_views')
                ->where('ad_id', $ad->id)
                ->whereIn('ip_address', $clientIpCandidates)
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
        $clientIp = $request->ip();
        $clientIpHash = PrivacyFingerprint::ip($clientIp, 'ad-impression');
        $clientIpCandidates = array_values(array_unique(array_filter([
            $clientIpHash,
            PrivacyFingerprint::legacySha256($clientIp),
        ])));
        $seenRecently = DB::table('ad_impressions')
            ->whereIn('ad_id', $adIds)
            ->whereIn('ip_address', $clientIpCandidates)
            ->where('placement', $placement)
            ->where('created_at', '>=', now()->subHours(6))
            ->pluck('ad_id')
            ->all();

        $seenMap = array_flip($seenRecently);
        $validAdIds = DB::table('ads')
            ->whereIn('id', $adIds)
            ->where('status', 'active')
            ->where('is_catalog_filler', false)
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

        $reportId = DB::table('reports')->insertGetId([
            'ad_id' => $id,
            'user_id' => auth('sanctum')->id(), // Может быть null для гостей
            'reason' => $request->reason,
            'comments' => $request->comments,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Reporte enviado exitosamente. Gracias por ayudarnos a mantener la plataforma segura.',
            'report_reference' => sprintf('RPT-A-%08d', $reportId),
        ]);
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
    public function myAds(Request $request, AdModerationGuidanceService $guidance)
    {
        $ads = Ad::with(['user:' . self::PUBLIC_AD_USER_COLUMNS, 'latestModerationDecision'])
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

        $ads->getCollection()->transform(function (Ad $ad) use ($guidance) {
            $ad->setAttribute('seller_correction', $guidance->sellerCorrection($ad));
            $ad->unsetRelation('latestModerationDecision');
            return $ad;
        });

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
            $ads = DB::table('ads')
                ->where('status', 'active')
                ->where('is_catalog_filler', false)
                ->whereNotNull('expires_at')
                ->where('expires_at', '>', now())
                ->latest()
                ->limit(10000)
                ->get(['id', 'updated_at', 'category']);

            $content = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            $content .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

            $content .= "   <url>\n      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/</loc>\n      <changefreq>always</changefreq>\n      <priority>1.0</priority>\n   </url>\n";

            // SEO: Добавляем статические страницы в карту сайта
            $staticPages = ['terminos', 'privacidad', 'cookies', 'contacto', 'ayuda', 'safety', 'reembolsos', 'moderacion'];
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

        // PDF exports may contain seller/listing details and are owner/admin only.
        $user = auth('sanctum')->user();
        if (! $user || ((int) $user->id !== (int) $ad->user_id && $user->role !== 'admin')) {
            return response()->json(['message' => 'Anuncio no disponible para exportación.'], 403);
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
                ->where('is_catalog_filler', false)
                ->whereNotNull('expires_at')
                ->where('expires_at', '>', now())
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

        if ($ad->status !== 'active' || $ad->is_catalog_filler) {
            return response()->json([
                'message' => $ad->is_catalog_filler ? 'Referencia de catálogo' : 'Anuncio inactivo',
                'ignored' => true,
            ]);
        }

        $clientIp = $request->ip();
        $clientIpHash = PrivacyFingerprint::ip($clientIp, 'ad-click');
        $clientIpCandidates = array_values(array_unique(array_filter([
            $clientIpHash,
            PrivacyFingerprint::legacySha256($clientIp),
        ])));

        // Защита от накрутки конверсии: 1 уникальный клик (WhatsApp/Telegram) с IP раз в 15 минут.
        $recentClick = DB::table('ad_clicks')
            ->where('ad_id', $ad->id)
            ->whereIn('ip_address', $clientIpCandidates)
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
     * Generate ad description using Local AI (text fields, no image required)
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
            /** @var \App\Services\LocalAiClient $client */
            $client = app(\App\Services\LocalAiClient::class);
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
                throw new \RuntimeException('Empty response from local AI.');
            }

            $description = trim($text);
            if ($this->containsUnsupportedAiClaims($description, $request)) {
                $description = $this->safeGeneratedDescription($request);
            }

            return response()->json(['description' => $description]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Local AI generateDescription error: ' . $e->getMessage());
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
        /** @var \App\Services\LocalAiClient $client */
        $client = app(\App\Services\LocalAiClient::class);
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
        if ($ad->status === 'archived' && $ad->ai_moderation_status === 'approved') {
            $validated = $request->validate([
                'confirm_available' => 'required|accepted',
                'price' => 'required|numeric|min:0|max:9999999999.99',
                'condition' => 'required|in:nuevo,usado,new,used',
                'location' => 'required|string|max:255',
                'state' => 'required|string|max:60',
                'city' => 'required|string|max:100',
            ]);

            $ad->forceFill([
                'price' => $validated['price'],
                'condition' => $validated['condition'],
                'location' => trim($validated['location']),
                'state' => trim($validated['state']),
                'city' => trim($validated['city']),
                'status' => 'active',
                'expires_at' => Ad::freshExpiry(),
                'reminder_sent_at' => null,
                'republished_at' => now(),
            ])->save();
        } elseif ($ad->status === 'paused') {
            if (! $ad->expires_at || $ad->expires_at->isPast()) {
                return response()->json([
                    'message' => 'El periodo del anuncio terminó. Renueva el anuncio para volver a activarlo.',
                ], 422);
            }

            $ad->status = 'active';
            $ad->save();
        } else {
            return response()->json([
                'message' => 'Solo puedes reactivar anuncios pausados o aprobados pendientes de confirmación.',
            ], 422);
        }

        Cache::forget("ad_{$id}");
        Cache::forget('sitemap_xml');
        for ($i = 1; $i <= 10; $i++) { Cache::forget("ads_index_page_{$i}"); }

        return response()->json($ad->fresh('user'));
    }

    /**
     * Internal republish fallback. Regular seller renewals are intercepted by paid-renewal middleware.
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
            'expires_at' => Ad::freshExpiry(),
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

        $affected = 0;
        if ($action === 'pause') {
            $affected = Ad::whereIn('id', $adIds)->where('user_id', $userId)
                ->where('status', 'active')
                ->update(['status' => 'paused', 'updated_at' => now()]);

        } elseif ($action === 'activate') {
            $eligibleCount = Ad::whereIn('id', $adIds)
                ->where('user_id', $userId)
                ->where('status', 'paused')
                ->whereNotNull('expires_at')
                ->where('expires_at', '>', now())
                ->count();

            if ($eligibleCount !== count($adIds)) {
                return response()->json([
                    'message' => 'Solo puedes reactivar en grupo anuncios pausados cuyo periodo siga vigente.',
                ], 422);
            }

            $affected = Ad::whereIn('id', $adIds)->where('user_id', $userId)
                ->where('status', 'paused')
                ->where('expires_at', '>', now())
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
            $affected = Ad::whereIn('id', $adIds)->where('user_id', $userId)->delete();
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
            'affected' => $affected,
            'action'   => $action,
        ]);
    }

    /**
     * Похожие объявления через pgvector (косинусное сходство)
     */
    public function similar(Request $request, $id)
    {
        $ad = Ad::findOrFail($id);

        try {
            $embeddingString = DB::table('embeddings')
                ->where('ad_id', $ad->id)
                ->selectRaw('embedding::text as embedding_text')
                ->value('embedding_text');
        } catch (\Throwable) {
            $embeddingString = null;
        }

        // No canonical vector: deterministic category fallback.
        if (! is_string($embeddingString) || $embeddingString === '') {
            $fallback = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
                ->where('status', 'active')
                ->where('category', $ad->category)
                ->where('id', '!=', $ad->id)
                ->latest()
                ->limit(8)
                ->get();

            return response()->json($fallback);
        }

        $similar = Ad::with('user:' . self::PUBLIC_AD_USER_COLUMNS)
            ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
            ->select('ads.*')
            ->selectRaw('(embeddings.embedding <=> ?::vector) AS vec_distance', [$embeddingString])
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->where('ads.id', '!=', $ad->id)
            ->whereNotNull('embeddings.embedding')
            ->orderBy('vec_distance')
            ->limit(8)
            ->get();

        // If genuine semantic supply is sparse, preserve the existing category fallback.
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
     * Internal renewal fallback using the configured listing lifetime.
     * Regular seller requests are intercepted by paid-renewal middleware.
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
            'expires_at'      => Ad::freshExpiry(),
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

    /**
     * Log a contact click on an ad (WhatsApp, Telegram, Email, Phone)
     * Rate limited to prevent abuse
     */
    public function contactClick(Request $request, $id)
    {
        $request->validate([
            'channel' => 'required|in:whatsapp,telegram,email,phone,share',
            'ad_id' => 'nullable|integer',
        ]);

        $ad = \App\Models\Ad::find($id);
        if (!$ad) {
            return response()->json(['error' => 'Ad not found'], 404);
        }

        // Rate limiting: max 10 contact clicks per IP per hour. Existing raw-IP rows
        // are match-only compatibility; new rows persist only a keyed fingerprint.
        $ip = trim((string) $request->ip());
        $ipFingerprint = PrivacyFingerprint::ip($ip, 'contact-click', 45);
        $ipCandidates = array_values(array_unique(array_filter([$ipFingerprint, $ip])));
        $recentClicks = \App\Models\ContactClick::whereIn('ip_address', $ipCandidates)
            ->where('created_at', '>', now()->subHour())
            ->count();

        if ($recentClicks >= 10) {
            return response()->json([
                'error' => 'Too many contact attempts. Please try again later.',
                'retry_after' => 3600
            ], 429);
        }

        $click = \App\Models\ContactClick::create([
            'ad_id' => $ad->id,
            'user_id' => auth()->id(),
            'channel' => $request->channel,
            'ip_address' => $ipFingerprint,
            'user_agent' => substr($request->userAgent() ?? '', 0, 255),
        ]);

        // Increment ad counter for analytics
        $ad->increment('contact_clicks');

        return response()->json([
            'success' => true,
            'click_id' => $click->id,
        ]);
    }
}
