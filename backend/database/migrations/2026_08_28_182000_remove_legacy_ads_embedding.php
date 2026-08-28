<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS ads_embedding_idx');
        DB::statement('DROP INDEX CONCURRENTLY IF EXISTS ads_embedding_index');
        DB::statement('ALTER TABLE ads DROP COLUMN IF EXISTS embedding');
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement('ALTER TABLE ads ADD COLUMN IF NOT EXISTS embedding vector(768)');
        DB::statement(<<<'SQL'
            UPDATE ads
            SET embedding = embeddings.embedding
            FROM embeddings
            WHERE embeddings.ad_id = ads.id
              AND embeddings.embedding IS NOT NULL
              AND ads.embedding IS NULL
        SQL);
        DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_embedding_index ON ads USING hnsw (embedding vector_cosine_ops)');
        DB::statement('CREATE INDEX CONCURRENTLY IF NOT EXISTS ads_embedding_idx ON ads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)');
    }
};
