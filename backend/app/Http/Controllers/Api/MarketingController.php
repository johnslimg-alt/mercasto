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

        return $this->runMetaAction(fn () => [
            'provider' => 'meta',
            ...$meta->campaigns((int) ($validated['days'] ?? 7), (int) ($validated['limit'] ?? 50)),
        ]);
    }

    public function updateMetaCampaignStatus(Request $request, MetaMarketingService $meta, string $campaignId): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:ACTIVE,PAUSED'],
        ]);

        return $this->runMetaAction(fn () => [
            'provider' => 'meta',
            'campaign' => $meta->updateCampaignStatus($campaignId, $validated['status']),
        ]);
    }

    public function updateMetaCampaignBudget(Request $request, MetaMarketingService $meta, string $campaignId): JsonResponse
    {
        $this->ensureAdmin($request);

        $validated = $request->validate([
            'daily_budget' => ['required', 'numeric', 'min:1', 'max:1000000'],
        ]);

        return $this->runMetaAction(fn () => [
            'provider' => 'meta',
            'campaign' => $meta->updateCampaignBudget($campaignId, (float) $validated['daily_budget']),
        ]);
    }

    private function runMetaAction(callable $action): JsonResponse
    {
        try {
            return response()->json($action());
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
