<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class BusinessProfileController extends Controller
{
    private function imageManager(): ImageManager
    {
        return ImageManager::withDriver(Driver::class);
    }

    public function show(Request $request)
    {
        return response()->json($this->businessProfilePayload($request->user(), includePrivate: true));
    }

    public function publicShow(int $id)
    {
        $payload = Cache::remember("public_business_profile_{$id}", 600, function () use ($id) {
            $user = User::findOrFail($id);

            return $this->businessProfilePayload($user, includePrivate: false);
        });

        return response()->json($payload);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'business_profile_enabled' => ['sometimes', 'boolean'],
            'business_name' => ['nullable', 'string', 'max:120'],
            'business_rfc' => ['nullable', 'string', 'regex:/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/i'],
            'business_website' => ['nullable', 'url', 'max:255'],
            'business_phone' => ['nullable', 'string', 'max:20'],
            'business_whatsapp' => ['nullable', 'string', 'max:20'],
            'business_address' => ['nullable', 'string', 'max:255'],
            'business_description' => ['nullable', 'string', 'max:1200'],
            'business_hours' => ['nullable', 'array'],
            'business_hours.*.day' => ['required_with:business_hours', 'string', 'max:20'],
            'business_hours.*.open' => ['nullable', 'date_format:H:i'],
            'business_hours.*.close' => ['nullable', 'date_format:H:i'],
            'business_hours.*.closed' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('business_rfc', $data)) {
            $nextRfc = $data['business_rfc'] ? strtoupper(trim($data['business_rfc'])) : null;
            if ($nextRfc !== $user->business_rfc) {
                $user->business_rfc_verified_at = null;
            }
            $data['business_rfc'] = $nextRfc;
        }

        if (($data['business_profile_enabled'] ?? false) && empty($data['business_name']) && empty($user->business_name)) {
            return response()->json([
                'message' => 'El nombre comercial es obligatorio para activar el perfil de negocio.',
                'errors' => ['business_name' => ['El nombre comercial es obligatorio para activar el perfil de negocio.']],
            ], 422);
        }

        $user->fill($data);
        $user->save();

        $this->clearProfileCaches($user->id);

        return response()->json($this->businessProfilePayload($user->fresh(), includePrivate: true));
    }

    public function uploadLogo(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'logo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        if ($user->business_logo_url && ! str_starts_with($user->business_logo_url, 'http')) {
            Storage::disk('public')->delete($user->business_logo_url);
        }

        $path = 'business-logos/' . Str::uuid() . '.webp';
        $img = $this->imageManager()
            ->decode($request->file('logo'))
            ->contain(512, 512)
            ->encodeUsingFileExtension('webp', quality: 88);

        Storage::disk('public')->put($path, (string) $img);

        $user->business_logo_url = $path;
        $user->save();

        $this->clearProfileCaches($user->id);

        return response()->json([
            'business_logo_url' => $user->business_logo_url,
            'message' => 'Logo actualizado correctamente',
        ]);
    }

    public function uploadBanner(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'banner' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240', 'dimensions:max_width=4096,max_height=4096'],
        ]);

        if ($user->business_banner_url && ! str_starts_with($user->business_banner_url, 'http')) {
            Storage::disk('public')->delete($user->business_banner_url);
        }

        $path = 'business-banners/' . Str::uuid() . '.webp';
        $img = $this->imageManager()
            ->decode($request->file('banner'))
            ->cover(1200, 400)
            ->encodeUsingFileExtension('webp', quality: 90);

        Storage::disk('public')->put($path, (string) $img);

        $user->business_banner_url = $path;
        $user->save();

        $this->clearProfileCaches($user->id);

        return response()->json([
            'business_banner_url' => $user->business_banner_url,
            'message' => 'Banner de portada actualizado correctamente',
        ]);
    }

    private function businessProfilePayload(User $user, bool $includePrivate): array
    {
        $isBusiness = $user->role === 'business' || (bool) $user->business_profile_enabled;

        $payload = [
            'user_id' => $user->id,
            'enabled' => (bool) $user->business_profile_enabled,
            'is_business' => $isBusiness,
            'business_name' => $user->business_name,
            'business_logo_url' => $user->business_logo_url,
            'business_banner_url' => $user->business_banner_url,
            'business_website' => $user->business_website ?: $user->website,
            'business_phone' => $includePrivate ? $user->business_phone : null,
            'business_whatsapp' => $isBusiness ? ($user->business_whatsapp ?: $user->whatsapp) : null,
            'business_hours' => $user->business_hours ?: [],
            'business_address' => $user->business_address,
            'business_description' => $user->business_description,
            'business_rfc_verified' => (bool) $user->business_rfc_verified_at,
        ];

        if ($includePrivate) {
            $payload['business_rfc'] = $user->business_rfc;
            $payload['business_rfc_verified_at'] = $user->business_rfc_verified_at?->toISOString();
        }

        return $payload;
    }

    public function directory(Request $request)
    {
        $query = User::where(function($q) {
            $q->where('business_profile_enabled', true)
              ->orWhere('role', 'business');
        });

        // Filter by state/city if provided
        if ($request->filled('state')) {
            $query->where('business_address', 'like', '%' . $request->state . '%');
        }
        if ($request->filled('city')) {
            $query->where('business_address', 'like', '%' . $request->city . '%');
        }

        // Filter by search query (name or description)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('business_name', 'like', "%{$search}%")
                  ->orWhere('business_description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $category = $request->category;
            $query->where('business_description', 'like', "%{$category}%");
        }

        $stores = $query->select([
            'id', 'name', 'avatar_url', 'role', 'is_verified', 'created_at',
            'business_name', 'business_logo_url', 'business_banner_url',
            'business_website', 'business_address',
            'business_description', 'business_rfc_verified_at'
        ])->latest()->paginate(24);

        // Map rating average and total ads count per store to display on the directory
        $stores->getCollection()->transform(function($store) {
            $reviewStats = DB::table('reviews')
                ->where('seller_id', $store->id)
                ->selectRaw('COUNT(*) as count, AVG(rating) as avg')
                ->first();

            $store->rating_count = (int) ($reviewStats->count ?? 0);
            $store->rating_avg = round((float) ($reviewStats->avg ?? 0), 1);
            $store->active_ads_count = DB::table('ads')
                ->where('user_id', $store->id)
                ->where('status', 'active')
                ->count();

            return $store;
        });

        return response()->json($stores);
    }

    private function clearProfileCaches(int $userId): void
    {
        Cache::forget("public_profile_{$userId}");
        Cache::forget("public_business_profile_{$userId}");
        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
    }
}
