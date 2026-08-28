<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class LegacyAdsEmbeddingCleanupContractTest extends TestCase
{
    public function test_cleanup_migration_is_reversible_and_non_transactional(): void
    {
        $path = __DIR__ . '/../../database/migrations/2026_08_28_182000_remove_legacy_ads_embedding.php';
        $source = file_get_contents($path);

        $this->assertIsString($source);
        $this->assertStringContainsString('public $withinTransaction = false;', $source);
        $this->assertStringContainsString('DROP INDEX CONCURRENTLY IF EXISTS ads_embedding_idx', $source);
        $this->assertStringContainsString('DROP INDEX CONCURRENTLY IF EXISTS ads_embedding_index', $source);
        $this->assertStringContainsString('ALTER TABLE ads DROP COLUMN IF EXISTS embedding', $source);
        $this->assertStringContainsString('ALTER TABLE ads ADD COLUMN IF NOT EXISTS embedding vector(768)', $source);
        $this->assertStringContainsString('SET embedding = embeddings.embedding', $source);
        $this->assertStringContainsString('CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_embedding_index', $source);
        $this->assertStringContainsString('CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_embedding_idx', $source);
    }
}
