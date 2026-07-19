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

                if ($action === 'activate' && $this->hasTimeRemaining($ad)) {
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
                ->where(function ($query) {
                    $query->whereNull('expires_at')->orWhere('expires_at', '<=', now());
                })
                ->pluck('id');

            if ($expiredIds->isNotEmpty()) {
                return response()->json([
                    'message' => 'Los anuncios vencidos deben renovarse individualmente por $49 MXN cada 7 días.',
                    'expired_ad_ids' => $expiredIds,
                ], 422);
            }
        }

        if (preg_match('#^api/ads/(\d+)/status$#', $path, $matches)
            && $request->isMethod('PATCH')
            && $request->input('status') === 'active') {
            $ad = DB::table('ads')->where('id', (int) $matches[1])->first();
            if ($ad && (int) $ad->user_id === (int) $user->id && ! $this->hasTimeRemaining($ad)) {
                return $this->renewals->createCheckout($request, $ad);
            }
        }

        return $next($request);
    }

    private function hasTimeRemaining(object $ad): bool
    {
        return $ad->expires_at !== null && now()->lt($ad->expires_at);
    }

    private function expireDueAds(): void
    {
        if (! Cache::add('ads:expire-due-guard', true, now()->addMinute())) {
            return;
        }

        DB::table('ads')
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);
    }
}
