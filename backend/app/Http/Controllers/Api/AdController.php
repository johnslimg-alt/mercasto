<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Intervention\Image\Facades\Image;
use Illuminate\Support\Str;
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
        $query = Ad::with('user:id,name,role,email,avatar_url,is_verified,created_at')
            ->addSelect(['whatsapp_clicks' => DB::table('ad_clicks')
                ->selectRaw('count(*)')
                ->whereColumn('ad_id', 'ads.id')
                ->where('channel', 'whatsapp')
            ]);

        // Поиск по радиусу
        if ($request->filled('lat') && $request->filled('lng') && $request->filled('radius')) {
            $lat = (float) $request->lat;
            $lng = (float) $request->lng;
            $radius = (int) $request->radius;

            $haversine = "( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) )";

            $query->selectRaw("*, {$haversine} AS distance", [$lat, $lng, $lat])
                  ->where('status', 'active')
                  ->whereNotNull('latitude') // Искать только объявления с координатами
                  ->whereRaw("{$haversine} < ?", [$lat, $lng, $lat, $radius])
                  ->orderBy('distance');
        } else {
            $query->where('ads.status', 'active')->latest(); // Стандартная сортировка
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
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Фильтрация по локации
        if ($request->filled('location')) {
            $query->where('location', 'like', "%{$request->location}%");
        }
            
        $ads = $query->paginate(16); // Возвращаем по 16 объявлений на страницу
            
        return response()->json($ads);
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
            'category' => 'required|string|max:100',
            'images' => 'nullable|array|max:10', // Максимум 10 картинок
            'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120', // Максимум 5МБ каждая
            'condition' => 'nullable|in:nuevo,usado',
            'video_file' => 'nullable|file|mimetypes:video/mp4,video/quicktime|max:51200', // 50MB Max
        ]);

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
            foreach ($request->file('images') as $image) {
                // Generate a unique name and convert to WebP
                $filename = Str::uuid() . '.webp';
                $path = storage_path('app/public/ads/' . $filename);
                
                // Ensure directory exists
                $directory = dirname($path);
                if (!file_exists($directory)) {
                    mkdir($directory, 0755, true);
                }

                $img = Image::make($image)->orientate();
                
                // Защита от OOM (Out Of Memory) при загрузке огромных фото со смартфонов.
                // Уменьшаем изображение до разумных 1200px перед наложением водяного знака.
                $img->resize(1200, 1200, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });

                // Наложение водяного знака (логотипа)
                $watermarkPath = storage_path('app/public/logo-watermark.png');
                if (file_exists($watermarkPath)) {
                    $watermark = Image::make($watermarkPath);
                    // Масштабируем водяной знак до 15% ширины основного изображения
                    $watermark->resize($img->width() * 0.15, null, function ($constraint) {
                        $constraint->aspectRatio();
                    });
                    // Добавляем отступы в 20px от краев
                    $img->insert($watermark, 'bottom-right', 20, 20);
                }
                $img->encode('webp', 85)->save($path); // Сохраняем в WebP
                $imagePaths[] = 'ads/' . $filename;
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
            'title' => $request->title,
            'price' => $request->price,
            'condition' => $request->input('condition', 'usado'),
            'description' => $request->description,
            'location' => $request->location,
            'latitude' => $lat,
            'longitude' => $lng,
            'category' => $request->category,
            'image_url' => count($imagePaths) > 0 ? json_encode($imagePaths) : null,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
            'status' => 'pending', // Отправляем на модерацию
        ]);

        // Если видео было загружено, отправляем его в очередь на обработку
        if ($videoPath) {
            ProcessVideoWatermark::dispatch($ad);
        }

        $ad->load('user');
        $ad->whatsapp_clicks = DB::table('ad_clicks')
            ->where('ad_id', $ad->id)
            ->where('channel', 'whatsapp')
            ->count();

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
            'category' => 'required|string|max:100',
            'existing_images' => 'nullable|array',
            'existing_images.*' => 'string',
            'images' => 'nullable|array|max:10', // Новые изображения
            'images.*' => 'file|mimes:jpg,jpeg,png,webp,gif|max:5120',
            'condition' => 'nullable|in:nuevo,usado',
            'video_url' => 'nullable|url|max:255',
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
        $keptImages = $request->input('existing_images', []);

        // Находим изображения для удаления, сравнивая текущие с сохраненными
        $imagesToDelete = array_diff($currentImages, $keptImages);
        if (count($imagesToDelete) > 0) {
            Storage::disk('public')->delete($imagesToDelete);
        }

        // Загружаем новые изображения
        $newImagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                // Generate a unique name and convert to WebP
                $filename = Str::uuid() . '.webp';
                $path = storage_path('app/public/ads/' . $filename);

                // Ensure directory exists
                $directory = dirname($path);
                if (!file_exists($directory)) {
                    mkdir($directory, 0755, true);
                }
                
                $img = Image::make($image)->orientate();
                
                // Защита от OOM (Out Of Memory) при загрузке огромных фото со смартфонов.
                // Уменьшаем изображение до разумных 1200px перед наложением водяного знака.
                $img->resize(1200, 1200, function ($constraint) {
                    $constraint->aspectRatio();
                    $constraint->upsize();
                });

                // Наложение водяного знака (логотипа)
                $watermarkPath = storage_path('app/public/logo-watermark.png');
                if (file_exists($watermarkPath)) {
                    $watermark = Image::make($watermarkPath);
                    // Масштабируем водяной знак до 15% ширины основного изображения
                    $watermark->resize($img->width() * 0.15, null, function ($constraint) {
                        $constraint->aspectRatio();
                    });
                    // Добавляем отступы в 20px от краев
                    $img->insert($watermark, 'bottom-right', 20, 20);
                }

                $img->encode('webp', 85)->save($path); // Сохраняем в WebP
                $newImagePaths[] = 'ads/' . $filename;
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
            'image_url' => count($finalImagePaths) > 0 ? json_encode($finalImagePaths) : null,
            'video_url' => $videoPath,
            'video_processing_status' => $videoProcessingStatus,
        ]);

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
        
        if ($request->status === 'active' && $ad->status !== 'active') {
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
            }

            // Email subscriptions logic
            $subscribers = User::whereIn('id', function($query) use ($ad) {
                $query->select('user_id')->from('category_subscriptions')->where('category_slug', $ad->category);
            })->where('id', '!=', $ad->user_id)->get(); // Don't notify the ad owner

            foreach ($subscribers as $subscriber) {
                // Here we can check user's notification preferences
                $prefs = $subscriber->notification_preferences ?? ['email_alerts' => true];
                if ($prefs['email_alerts'] ?? true) {
                     Mail::to($subscriber)->queue(new NewAdInCategory($ad));
                }
            }
        }
        
        $ad->status = $request->status;
        $ad->save();

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

        // Удаляем все картинки из хранилища, если они есть
        if ($ad->image_url) {
            $images = json_decode($ad->image_url, true);
            if (is_array($images)) {
                foreach ($images as $path) {
                    Storage::disk('public')->delete($path);
                }
            } else {
                Storage::disk('public')->delete($ad->image_url); // Обратная совместимость для старых записей
            }
        }

        // Удаляем прикрепленное видео, чтобы не засорять жесткий диск
        if ($ad->video_url) {
            Storage::disk('public')->delete($ad->video_url);
        }

        $ad->delete();

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

        $path = $request->file('file')->getRealPath();
        $extension = $request->file('file')->getClientOriginalExtension();
        $count = 0;

        if (strtolower($extension) === 'xml') {
            $xml = simplexml_load_file($path);
            if ($xml && isset($xml->ad)) {
                foreach ($xml->ad as $adNode) {
                    Ad::create([
                        'user_id' => $request->user()->id,
                        'title' => substr((string)$adNode->title, 0, 255),
                        'price' => is_numeric((string)$adNode->price) ? (float)$adNode->price : 0,
                        'description' => (string)$adNode->description,
                        'location' => substr((string)$adNode->location, 0, 255),
                        'category' => substr((string)$adNode->category, 0, 100),
                        'status' => 'pending', // Отправляем на модерацию
                    ]);
                    $count++;
                }
            }
        } else {
            $data = array_map('str_getcsv', file($path));
            array_shift($data); // Удаляем заголовки колонок
            foreach ($data as $row) {
                if (count($row) >= 5) {
                    Ad::create([
                        'user_id' => $request->user()->id,
                        'title' => substr($row[0], 0, 255),
                        'price' => is_numeric($row[1]) ? (float) $row[1] : 0,
                        'description' => $row[2],
                        'location' => substr($row[3], 0, 255),
                        'category' => substr($row[4], 0, 100),
                        'status' => 'pending', // Отправляем на модерацию
                    ]);
                    $count++;
                }
            }
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
        
        $ads = Ad::with('user:id,name,email')->where('status', 'pending')->latest()->get();
        
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
            ->select('reports.*', 'ads.title as ad_title', 'ads.status as ad_status', 'users.name as reporter_name', 'users.email as reporter_email')
            ->orderByDesc('reports.created_at')
            ->get();
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
            $ad->increment('views');

            DB::table('ad_views')->insert([
                'ad_id' => $ad->id,
                'user_id' => auth('sanctum')->id(), // Captures user if logged in
                'ip_address' => $request->ip(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['success' => true, 'views' => $ad->views]);
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
        if (!Ad::find($id)) {
            return response()->json(['message' => 'Объявление не найдено'], 404);
        }

        $exists = DB::table('favorites')->where('user_id', $userId)->where('ad_id', $id)->exists();

        if ($exists) {
            DB::table('favorites')->where('user_id', $userId)->where('ad_id', $id)->delete();
            return response()->json(['status' => 'removed']);
        } else {
            DB::table('favorites')->insert(['user_id' => $userId, 'ad_id' => $id, 'created_at' => now(), 'updated_at' => now()]);
            return response()->json(['status' => 'added']);
        }
    }

    /**
     * Получение всех объявлений текущего пользователя
     */
    public function myAds(Request $request)
    {
        $ads = Ad::with('user:id,name,role,email,avatar_url,is_verified,created_at')
            ->addSelect(['whatsapp_clicks' => DB::table('ad_clicks')
                ->selectRaw('count(*)')
                ->whereColumn('ad_id', 'ads.id')
                ->where('channel', 'whatsapp')
            ])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(50); // Пагинация вместо жесткого лимита для PRO-продавцов
            
        return response()->json($ads);
    }

    /**
     * Получение полных данных избранных объявлений пользователя
     */
    public function favoriteAds(Request $request)
    {
        $userId = $request->user()->id;
        $ads = Ad::with('user:id,name,role,email,avatar_url,is_verified,created_at')
            ->addSelect(['whatsapp_clicks' => DB::table('ad_clicks')
                ->selectRaw('count(*)')
                ->whereColumn('ad_id', 'ads.id')
                ->where('channel', 'whatsapp')
            ])
            ->whereIn('id', function($query) use ($userId) {
                $query->select('ad_id')->from('favorites')->where('user_id', $userId);
            })
            ->latest()
            ->paginate(50); // Пагинация вместо жесткого лимита
            
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
        // Ограничиваем до 10,000 записей, чтобы избежать падения сервера (OOM) при миллионах объявлений
        $ads = Ad::where('status', 'active')->latest()->limit(10000)->get(['id', 'updated_at', 'category']);
        
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
        
        // Главная страница
        $xml .= "   <url>\n      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/</loc>\n      <changefreq>always</changefreq>\n      <priority>1.0</priority>\n   </url>\n";
        
        // Уникальные категории
        $categories = $ads->pluck('category')->unique();
        foreach ($categories as $category) {
            $xml .= "   <url>\n";
            $xml .= "      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/?cat=" . urlencode($category) . "</loc>\n";
            $xml .= "      <changefreq>hourly</changefreq>\n      <priority>0.9</priority>\n   </url>\n";
        }
        
        // Динамические страницы объявлений
        foreach ($ads as $ad) {
            $xml .= "   <url>\n";
            $xml .= "      <loc>" . config('app.frontend_url', 'https://mercasto.com') . "/?ad=" . $ad->id . "</loc>\n";
            $xml .= "      <lastmod>" . $ad->updated_at->toAtomString() . "</lastmod>\n";
            $xml .= "      <changefreq>daily</changefreq>\n      <priority>0.8</priority>\n   </url>\n";
        }
        
        $xml .= '</urlset>';
        
        return response($xml)->header('Content-Type', 'application/xml');
    }

    /**
     * Генерация PDF-брошюры для объявления
     */
    public function generatePdf($id)
    {
        $ad = Ad::with('user')->findOrFail($id);

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
        $ads = Ad::with('user:id,name')
            ->where('status', 'active')
            ->where('price', '>', 0)
            ->latest()
            ->limit(5000) // Ограничиваем количество для производительности
            ->get();

        return response()
            ->view('xml.google_merchant', ['ads' => $ads])
            ->header('Content-Type', 'application/xml');
    }

    /**
     * Запись клика по кнопкам контактов (WhatsApp / Telegram) для аналитики
     */
    public function recordClick(Request $request, $id)
    {
        $request->validate(['channel' => 'required|string']);
        $ad = Ad::findOrFail($id);

        DB::table('ad_clicks')->insert([
            'ad_id' => $ad->id,
            'user_id' => auth('sanctum')->id(), // Может быть null для гостей
            'channel' => $request->channel,
            'ip_address' => $request->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['success' => true]);
    }
}