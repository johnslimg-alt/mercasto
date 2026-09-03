<?php

namespace App\Http\Controllers\Api;

use App\Models\Ad;
use App\Services\AI\SemanticSearchService;
use Illuminate\Http\Request;

class DiscoveryAdController extends AdController
{
    private const PUBLIC_USER_COLUMNS = 'id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp';

    public function __construct(private SemanticSearchService $semanticSearch)
    {
    }

    public function similar(Request $request, $id)
    {
        $ad = Ad::query()->findOrFail($id);
        $limit = max(1, min(24, (int) $request->integer('limit', 10)));
        $similar = $this->semanticSearch->findSimilar($ad, $limit);

        if ($similar !== []) {
            return response()->json($similar);
        }

        $fallback = Ad::with('user:'.self::PUBLIC_USER_COLUMNS)
            ->where('status', 'active')
            ->where('is_catalog_filler', false)
            ->where('id', '!=', $ad->id)
            ->where(function ($builder) {
                $builder->whereNull('expires_at')->orWhere('expires_at', '>', now());
            });

        if (is_string($ad->category) && trim($ad->category) !== '') {
            $fallback->where('category', $ad->category);
        }
        if (is_string($ad->condition) && trim($ad->condition) !== '') {
            $fallback->where('condition', $ad->condition);
        }

        $price = (float) ($ad->price ?? 0);
        if ($price > 0) {
            $floor = max(0.0, (float) config('discovery.similar.price_floor_ratio', 0.5));
            $ceiling = max($floor, (float) config('discovery.similar.price_ceiling_ratio', 1.5));
            $fallback->whereBetween('price', [$price * $floor, $price * $ceiling]);
        }

        if (is_string($ad->state) && trim($ad->state) !== '') {
            $fallback->orderByRaw('CASE WHEN state = ? THEN 0 ELSE 1 END', [$ad->state]);
        }

        return response()->json(
            $fallback
                ->orderByRaw("CASE WHEN promoted IS NOT NULL AND (boost_expires_at IS NULL OR boost_expires_at > CURRENT_TIMESTAMP) THEN 0 ELSE 1 END")
                ->latest()
                ->limit($limit)
                ->get()
        );
    }
}
