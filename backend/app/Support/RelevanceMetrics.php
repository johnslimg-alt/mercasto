<?php

namespace App\Support;

final class RelevanceMetrics
{
    public static function precisionAt(array $rankedIds, array $relevantIds, int $k): float
    {
        $k = max(1, $k);
        $ranked = array_slice(self::ids($rankedIds), 0, $k);
        $relevant = array_fill_keys(self::ids($relevantIds), true);
        $hits = count(array_filter($ranked, fn (int|string $id): bool => isset($relevant[$id])));

        return $hits / $k;
    }

    public static function recallAt(array $rankedIds, array $relevantIds, int $k): float
    {
        $relevantIds = self::ids($relevantIds);
        if ($relevantIds === []) {
            return 1.0;
        }

        $ranked = array_slice(self::ids($rankedIds), 0, max(1, $k));
        $relevant = array_fill_keys($relevantIds, true);
        $hits = count(array_filter($ranked, fn (int|string $id): bool => isset($relevant[$id])));

        return $hits / count($relevantIds);
    }

    public static function reciprocalRank(array $rankedIds, array $relevantIds): float
    {
        $relevant = array_fill_keys(self::ids($relevantIds), true);
        foreach (self::ids($rankedIds) as $index => $id) {
            if (isset($relevant[$id])) {
                return 1.0 / ($index + 1);
            }
        }

        return 0.0;
    }

    public static function evaluate(array $cases, int $k = 5): array
    {
        if ($cases === []) {
            return ['cases' => 0, 'precision_at_k' => 0.0, 'recall_at_k' => 0.0, 'mrr' => 0.0, 'by_kind' => []];
        }

        $totals = ['precision' => 0.0, 'recall' => 0.0, 'mrr' => 0.0];
        $byKind = [];
        foreach ($cases as $case) {
            $kind = (string) ($case['kind'] ?? 'unknown');
            $ranked = (array) ($case['ranked_ids'] ?? []);
            $relevant = (array) ($case['relevant_ids'] ?? []);
            $metrics = [
                'precision' => self::precisionAt($ranked, $relevant, $k),
                'recall' => self::recallAt($ranked, $relevant, $k),
                'mrr' => self::reciprocalRank($ranked, $relevant),
            ];
            foreach ($metrics as $name => $value) {
                $totals[$name] += $value;
            }
            $byKind[$kind][] = $metrics;
        }

        $count = count($cases);

        return [
            'cases' => $count,
            'precision_at_k' => $totals['precision'] / $count,
            'recall_at_k' => $totals['recall'] / $count,
            'mrr' => $totals['mrr'] / $count,
            'by_kind' => array_map(fn (array $rows): array => self::average($rows), $byKind),
        ];
    }

    private static function average(array $rows): array
    {
        $count = max(1, count($rows));

        return [
            'cases' => count($rows),
            'precision_at_k' => array_sum(array_column($rows, 'precision')) / $count,
            'recall_at_k' => array_sum(array_column($rows, 'recall')) / $count,
            'mrr' => array_sum(array_column($rows, 'mrr')) / $count,
        ];
    }

    private static function ids(array $ids): array
    {
        return array_values(array_unique(array_filter($ids, fn ($id): bool => is_int($id) || is_string($id))));
    }
}
