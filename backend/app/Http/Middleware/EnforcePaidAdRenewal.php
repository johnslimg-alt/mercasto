<?php

namespace App\Http\Middleware;

use App\Services\AdRenewalService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnforcePaidAdRenewal
{
    public function __construct(private readonly AdRenewalService $renewals)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $this->expireDueAds();

        $user = Auth::guard('sanctum')->user();
        if (! $user || $user->role === 'admin') {
            return $next($request);
        }

        $path = trim($request->path(), '/');

        if (preg_match('#^api/ads/(\d+)/(renew|republish|activate)$#', $path, $matches)) {
            $adId = (int) $matches[1];
            $action = $matches[2];
            $expectedMethod = match ($action) {
                'republish' => 'POST',
                default => 'PUT',
            };

            if ($request->isMethod($expectedMethod)) {
                $ad = DB::table('ads')->where('id', $adId)->first();
                if (! $ad) {
                    return response()->json(['message' => 'Anuncio no encontrado.'], 404);
                }
                if ((int) $ad->user_id !== (int) $user->id) {
                    return response()->json(['message' => 'No tienes permisos para renovar este anuncio.'], 403);
                }

                if ((bool) ($ad->is_catalog_filler ?? false)) {
                    return $next($request);
                }

                if ($action === 'activate' && $ad->status !== 'expired' && $this->hasTimeRemaining($ad)) {
                    return $next($request);
                }

                if (! in_array($ad->status, ['active', 'expired', 'paused', 'inactive'], true)) {
                    return response()->json([
                        'message' => 'Este anuncio no se puede renovar mientras está en revisión o rechazado.',
                    ], 422);
                }

                return $this->renewals->createCheckout($request, $ad);
            }
        }

        if ($path === 'api/ads/bulk-action'
            && $request->isMethod('POST')
            && $request->input('action') === 'activate') {
            $ids = collect($request->input('ad_ids', []))
                ->filter(fn ($id) => is_numeric($id))
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->take(100)
                ->values();

            $expiredIds = DB::table('ads')
                ->where('user_id', $user->id)
                ->whereIn('id', $ids)
                ->where('is_catalog_filler', false)
                ->where(function ($query) {
                    $query->where('status', 'expired')
                        ->orWhereNull('expires_at')
                        ->orWhere('expires_at', '<=', now());
                })
                ->pluck('id');

            if ($expiredIds->isNotEmpty()) {
                $amount = number_format((float) config('marketplace.ad_renewal_price_mxn', 49), 0);
                $days = (int) config('marketplace.ad_renewal_days', 7);

                return response()->json([
                    'message' => "Los anuncios vencidos deben renovarse individualmente por \${$amount} MXN cada {$days} días.",
                    'expired_ad_ids' => $expiredIds,
                ], 422);
            }
        }

        if (preg_match('#^api/ads/(\d+)/status$#', $path, $matches)
            && $request->isMethod('PATCH')
            && $request->input('status') === 'active') {
            $ad = DB::table('ads')->where('id', (int) $matches[1])->first();
            if ($ad
                && (int) $ad->user_id === (int) $user->id
                && (bool) ($ad->is_catalog_filler ?? false)) {
                return $next($request);
            }
            if ($ad
                && (int) $ad->user_id === (int) $user->id
                && ($ad->status === 'expired' || ! $this->hasTimeRemaining($ad))) {
                return $this->renewals->createCheckout($request, $ad);
            }
        }

        return $next($request);
    }

    private function hasTimeRemaining(object $ad): bool
    {
        if ((bool) ($ad->is_catalog_filler ?? false)) {
            return true;
        }

        return $ad->expires_at !== null && now()->lt($ad->expires_at);
    }

    private function expireDueAds(): void
    {
        if (! Cache::add('ads:expire-due-guard', true, now()->addMinute())) {
            return;
        }

        $expiredAds = DB::table('ads')
            ->where('status', 'active')
            ->where('is_catalog_filler', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->get(['id', 'user_id', 'title']);

        if ($expiredAds->isEmpty()) {
            return;
        }

        $ids = $expiredAds->pluck('id');
        $amount = number_format((float) config('marketplace.ad_renewal_price_mxn', 49), 0);
        $days = (int) config('marketplace.ad_renewal_days', 7);
        $timestamp = now();

        DB::transaction(function () use ($expiredAds, $ids, $amount, $days, $timestamp) {
            DB::table('ads')
                ->whereIn('id', $ids)
                ->where('status', 'active')
                ->where('is_catalog_filler', false)
                ->update([
                    'status' => 'expired',
                    'updated_at' => $timestamp,
                ]);

            DB::table('user_notifications')->insert(
                $expiredAds->map(fn ($ad) => [
                    'user_id' => $ad->user_id,
                    'title' => 'Tu anuncio expiró',
                    'message' => "Tu anuncio \"{$ad->title}\" expiró. Renuévalo por {$days} días por \${$amount} MXN o elimínalo sin costo.",
                    'is_read' => false,
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ])->all()
            );
        });

        Cache::forget('sitemap_xml');
        Cache::forget('google_merchant_xml');
        Cache::forget('ads_featured_block');
        for ($page = 1; $page <= 10; $page++) {
            Cache::forget("ads_index_page_{$page}");
        }
        foreach ($ids as $id) {
            Cache::forget("ad_{$id}");
        }
    }
}
