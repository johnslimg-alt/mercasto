<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MetaMarketingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class MarketingController extends Controller
{
    public function metaStatus(Request $request, MetaMarketingService $meta): JsonResponse
    {
        $this->ensureAdmin($request);

        return response()->json(['provider' => 'meta', ...$meta->status()]);
    }

    public function metaCampaigns(Request $request, MetaMarketingService $meta): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'days' => ['nullable', 'integer', 'min:1', 'max:90'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        try {
            return response()->json([
                'provider' => 'meta',
                ...$meta->campaigns((int) ($validated['days'] ?? 7), (int) ($validated['limit'] ?? 50)),
            ]);
        } catch (RuntimeException $exception) {
            report($exception);

            return response()->json([
                'provider' => 'meta',
                'error' => $exception->getMessage(),
            ], str_contains($exception->getMessage(), 'not configured') ? 503 : 502);
        }
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless($request->user()?->role === 'admin', 403, 'Acceso denegado');
    }
}
