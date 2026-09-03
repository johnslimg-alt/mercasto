<?php

namespace App\Services;

use App\Models\User;
use App\Services\AI\SemanticRecommendationService;

class HybridRecommendationService
{
    public function __construct(
        private RecommendationService $legacy,
        private SemanticRecommendationService $semantic,
    ) {}

    public function getRecommendations(?User $user, int $limit = 12, ?int $excludeAdId = null): array
    {
        $limit = max(1, min(50, $limit));
        $fallback = $this->legacy->getRecommendations($user, $limit, $excludeAdId);

        if (! $user || ! (bool) config('semantic_retrieval.semantic_recommendations_enabled', true)) {
            return $fallback;
        }

        $strong = array_values(array_filter(
            $fallback,
            fn (array $item): bool => in_array(
                $item['recommendation_reason'] ?? null,
                ['content_based', 'collaborative'],
                true,
            ),
        ));

        $semantic = $this->semantic->recommend(
            $user,
            min(50, $limit * (int) config('semantic_retrieval.candidate_multiplier', 2)),
            $excludeAdId,
        );

        return $this->merge([$strong, $semantic, $fallback], $limit);
    }

    private function merge(array $groups, int $limit): array
    {
        $seen = [];
        $result = [];

        foreach ($groups as $group) {
            foreach ($group as $item) {
                $id = (int) ($item['id'] ?? 0);
                if ($id <= 0 || isset($seen[$id])) {
                    continue;
                }

                $seen[$id] = true;
                $result[] = $item;
                if (count($result) >= $limit) {
                    return $result;
                }
            }
        }

        return $result;
    }
}
