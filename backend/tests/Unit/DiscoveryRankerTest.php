<?php

namespace Tests\Unit;

use App\Services\AI\DiscoveryRanker;
use PHPUnit\Framework\TestCase;

class DiscoveryRankerTest extends TestCase
{
    public function test_precise_lexical_match_stays_above_semantic_only_result(): void
    {
        $scores = (new DiscoveryRanker())->fuse(
            lexicalIds: [101, 102],
            semanticIds: [201, 101, 202],
            sponsoredIds: [201],
        );

        $ordered = array_keys($scores);
        $this->assertSame(101, $ordered[0]);
        $this->assertLessThan(array_search(201, $ordered, true), array_search(102, $ordered, true));
    }

    public function test_sponsorship_never_creates_a_candidate(): void
    {
        $scores = (new DiscoveryRanker())->fuse(
            lexicalIds: [10],
            semanticIds: [20],
            sponsoredIds: [999, 20],
        );

        $this->assertArrayNotHasKey(999, $scores);
        $this->assertArrayHasKey(20, $scores);
    }

    public function test_fixed_relevance_fixture_has_perfect_known_item_recall_at_three(): void
    {
        $fixtures = [
            [[11], [20, 11, 21], 11],
            [[31, 32], [40, 41, 31], 31],
            [[51], [60, 61, 62, 51], 51],
        ];
        $hits = 0;

        foreach ($fixtures as [$lexical, $semantic, $expected]) {
            $top = array_slice(array_keys((new DiscoveryRanker())->fuse($lexical, $semantic)), 0, 3);
            $hits += in_array($expected, $top, true) ? 1 : 0;
        }

        $this->assertSame(1.0, $hits / count($fixtures));
    }
}
