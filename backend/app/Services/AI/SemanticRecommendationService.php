<?php

namespace App\Services\AI;

use App\Models\Ad;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Throwable;

class SemanticRecommendationService
{
    public function recommend(User $user, int $limit = 12, ?int $excludeAdId = null): array
    {
        if (! (bool) config('semantic_retrieval.semantic_recommendations_enabled', true)) {
            return [];
        }

        $historyLimit = (int) config('semantic_retrieval.profile_history_limit', 20);
        $favoriteIds = DB::table('favorites')
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->limit($historyLimit)
            ->pluck('ad_id')
            ->all();
        $viewedIds = DB::table('ad_views')
            ->where('user_id', $user->id)
            ->latest('viewed_at')
            ->limit($historyLimit)
            ->pluck('ad_id')
            ->all();
        $referenceIds = array_values(array_unique(array_map('intval', array_merge($favoriteIds, $viewedIds))));

        if ($referenceIds === []) {
            return [];
        }

        try {
            $profileVector = DB::table('embeddings')
                ->join('ads', 'ads.id', '=', 'embeddings.ad_id')
                ->whereIn('ads.id', $referenceIds)
                ->where('ads.status', 'active')
                ->where('ads.is_catalog_filler', false)
                ->whereNotNull('embeddings.embedding')
                ->selectRaw('AVG(embeddings.embedding)::text AS profile_vector')
                ->value('profile_vector');
        } catch (Throwable) {
            return [];
        }

        if (! is_string($profileVector) || $profileVector === '') {
            return [];
        }

        $excludedIds = array_values(array_unique(array_filter([
            ...$referenceIds,
            $excludeAdId,
        ], fn ($id) => is_numeric($id) && (int) $id > 0)));

        try {
            $candidates = DB::table('ads')
                ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
                ->select('ads.id')
                ->selectRaw('1 - (embeddings.embedding <=> ?::vector) AS similarity', [$profileVector])
                ->where('ads.status', 'active')
                ->where('ads.is_catalog_filler', false)
                ->whereNotNull('embeddings.embedding')
                ->when($excludedIds !== [], fn ($query) => $query->whereNotIn('ads.id', $excludedIds))
                ->orderByRaw('embeddings.embedding <=> ?::vector', [$profileVector])
                ->limit(max(1, min(50, $limit)))
                ->get();
        } catch (Throwable) {
            return [];
        }

        if ($candidates->isEmpty()) {
            return [];
        }

        $ads = Ad::query()->whereIn('id', $candidates->pluck('id'))->get()->keyBy('id');

        return $candidates->map(function ($row) use ($ads) {
            $ad = $ads->get($row->id);
            if (! $ad) {
                return null;
            }

            return [
                'id' => $ad->id,
                'title' => $ad->title,
                'price' => $ad->price,
                'currency' => $ad->currency ?? 'MXN',
                'state' => $ad->state,
                'city' => $ad->city,
                'category' => $ad->category,
                'images' => $ad->images ?? [],
                'views' => $ad->views ?? 0,
                'created_at' => $ad->created_at,
                'recommendation_reason' => 'semantic_profile',
                'reason_label' => 'Similar a tus intereses',
                'similarity_score' => round(((float) ($row->similarity ?? 0)) * 100, 1),
            ];
        })->filter()->values()->all();
    }
}
