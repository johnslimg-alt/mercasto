<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class DuplicateGeoIndexCleanupContractTest extends TestCase
{
    public function test_cleanup_is_postgres_only_concurrent_and_reversible(): void
    {
        $source = file_get_contents(__DIR__ . '/../../database/migrations/2026_08_28_181000_drop_duplicate_ads_latitude_longitude_index.php');

        $this->assertStringContainsString("getDriverName() !== 'pgsql'", $source);
        $this->assertStringContainsString('public bool $withinTransaction = false', $source);
        $this->assertStringContainsString('DROP INDEX CONCURRENTLY IF EXISTS public.ads_latitude_longitude_index', $source);
        $this->assertStringContainsString('CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_latitude_longitude_index ON public.ads (latitude, longitude)', $source);
        $this->assertStringNotContainsString('ads_geo_index', $source);
    }
}
