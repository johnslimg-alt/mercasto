<?php

namespace App\Services\AI;

class DiscoveryRanker
{
    private const RRF_K = 60.0;

    /**
     * Fuse deterministic lexical and semantic candidate ranks.
     *
     * Lexical matches intentionally receive twice the semantic weight so a
     * precise known-item query cannot be displaced by a vector-only candidate.
     * Sponsorship is only a small tie-break bonus after relevance eligibility.
     *
     * @return array<int, float> ad id => fused score, descending
     */
    public function fuse(array $lexicalIds, array $semanticIds, array $sponsoredIds = []): array
    {
        $scores = [];

        foreach ($this->normalizedIds($lexicalIds) as $index => $id) {
            $scores[$id] = ($scores[$id] ?? 0.0) + 2.0 / (self::RRF_K + $index + 1);
        }

        foreach ($this->normalizedIds($semanticIds) as $index => $id) {
            $scores[$id] = ($scores[$id] ?? 0.0) + 1.0 / (self::RRF_K + $index + 1);
        }

        foreach ($this->normalizedIds($sponsoredIds) as $id) {
            if (array_key_exists($id, $scores)) {
                $scores[$id] += 0.00025;
            }
        }

        arsort($scores, SORT_NUMERIC);

        return $scores;
    }

    /** @return list<int> */
    private function normalizedIds(array $ids): array
    {
        $normalized = [];
        foreach ($ids as $id) {
            $value = (int) $id;
            if ($value > 0) {
                $normalized[$value] = $value;
            }
        }

        return array_values($normalized);
    }
}
