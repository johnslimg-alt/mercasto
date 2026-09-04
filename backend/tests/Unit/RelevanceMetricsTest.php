<?php

namespace Tests\Unit;

use App\Support\RelevanceMetrics;
use PHPUnit\Framework\TestCase;

class RelevanceMetricsTest extends TestCase
{
    public function test_precision_recall_and_mrr_are_bounded_and_deterministic(): void
    {
        $ranked = [10, 20, 30, 40, 50];
        $relevant = [20, 40];

        $this->assertSame(0.4, RelevanceMetrics::precisionAt($ranked, $relevant, 5));
        $this->assertSame(1.0, RelevanceMetrics::recallAt($ranked, $relevant, 5));
        $this->assertSame(0.5, RelevanceMetrics::reciprocalRank($ranked, $relevant));
    }

    public function test_aggregate_metrics_are_reported_by_query_kind(): void
    {
        $metrics = RelevanceMetrics::evaluate([
            ['kind' => 'known_item', 'ranked_ids' => [1, 2], 'relevant_ids' => [1]],
            ['kind' => 'similar', 'ranked_ids' => [4, 3], 'relevant_ids' => [3, 4]],
            ['kind' => 'fuzzy_intent', 'ranked_ids' => [8, 9], 'relevant_ids' => [8]],
        ], 2);

        $this->assertSame(3, $metrics['cases']);
        $this->assertArrayHasKey('known_item', $metrics['by_kind']);
        $this->assertArrayHasKey('similar', $metrics['by_kind']);
        $this->assertArrayHasKey('fuzzy_intent', $metrics['by_kind']);
        $this->assertGreaterThanOrEqual(0.5, $metrics['precision_at_k']);
        $this->assertSame(1.0, $metrics['recall_at_k']);
        $this->assertSame(1.0, $metrics['mrr']);
    }

    public function test_empty_relevance_set_is_not_counted_as_false_negative(): void
    {
        $this->assertSame(1.0, RelevanceMetrics::recallAt([1, 2], [], 2));
        $this->assertSame(0.0, RelevanceMetrics::reciprocalRank([1, 2], []));
    }
}
