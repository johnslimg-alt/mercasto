<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class SemanticDiscoveryBenchmark extends Command
{
    protected $signature = 'semantic:benchmark
        {--allow-production : Explicitly permit the read-only EXPLAIN ANALYZE run}
        {--limit=8 : Result limit for the measured vector query}
        {--min-active=0 : Fail if genuine active inventory is below this scale}
        {--max-ms=0 : Fail if measured execution time exceeds this value; 0 only reports}';

    protected $description = 'Measure semantic retrieval with read-only PostgreSQL EXPLAIN evidence and no user/query payload output.';

    public function handle(): int
    {
        if (! (bool) config('semantic_discovery.benchmark.enabled', false) || ! $this->option('allow-production')) {
            $this->error('Semantic benchmark is disabled. Enable the dedicated flag and pass --allow-production.');
            return self::FAILURE;
        }
        if (DB::connection()->getDriverName() !== 'pgsql') {
            $this->error('Semantic benchmark requires PostgreSQL.');
            return self::FAILURE;
        }

        $limit = max(1, min(12, (int) $this->option('limit')));
        $minActive = max(0, (int) $this->option('min-active'));
        $maxMs = max(0.0, (float) $this->option('max-ms'));
        $started = hrtime(true);

        try {
            $activeCount = DB::table('ads')
                ->where('status', 'active')
                ->where('is_catalog_filler', false)
                ->where(fn ($query) => $query->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->count();
            $embeddingCount = DB::table('embeddings')->count();
            $sample = DB::table('embeddings')
                ->join('ads', 'ads.id', '=', 'embeddings.ad_id')
                ->where('ads.status', 'active')
                ->where('ads.is_catalog_filler', false)
                ->where(fn ($query) => $query->whereNull('ads.expires_at')->orWhere('ads.expires_at', '>', now()))
                ->whereNotNull('embeddings.embedding')
                ->select(['ads.id', 'ads.category'])
                ->selectRaw('embeddings.embedding::text as embedding_text')
                ->first();

            if (! $sample || ! is_string($sample->embedding_text ?? null) || trim($sample->embedding_text) === '') {
                $this->error('No genuine active embedding is available for read-only benchmark evidence.');
                return self::FAILURE;
            }

            $plan = DB::transaction(function () use ($sample, $limit): array {
                DB::statement("SET LOCAL hnsw.iterative_scan = 'strict_order'");
                $rows = DB::select(<<<'SQL'
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT ads.id
FROM ads
JOIN embeddings ON ads.id = embeddings.ad_id
WHERE ads.status = 'active'
  AND ads.is_catalog_filler = false
  AND ads.id <> ?
  AND ads.category = ?
  AND (ads.expires_at IS NULL OR ads.expires_at > NOW())
  AND embeddings.embedding IS NOT NULL
  AND (embeddings.embedding <=> ?::vector) <= ?
ORDER BY embeddings.embedding <=> ?::vector, ads.created_at DESC, ads.id DESC
LIMIT ?
SQL, [
                    (int) $sample->id,
                    (string) $sample->category,
                    $sample->embedding_text,
                    (float) config('semantic_discovery.similar.max_distance', 0.45),
                    $sample->embedding_text,
                    $limit,
                ]);

                $row = (array) ($rows[0] ?? []);
                $decoded = json_decode((string) (array_values($row)[0] ?? ''), true);
                if (! is_array($decoded) || ! is_array($decoded[0] ?? null)) {
                    throw new \RuntimeException('PostgreSQL returned an invalid JSON plan.');
                }

                return $decoded[0];
            }, 1);
        } catch (Throwable $error) {
            $this->error('Semantic benchmark failed: '.$error::class);
            return self::FAILURE;
        }

        $executionMs = (float) ($plan['Execution Time'] ?? 0.0);
        $planningMs = (float) ($plan['Planning Time'] ?? 0.0);
        $root = is_array($plan['Plan'] ?? null) ? $plan['Plan'] : [];
        $evidence = [
            'driver' => 'pgsql',
            'active_genuine_inventory' => (int) $activeCount,
            'embedding_rows' => (int) $embeddingCount,
            'result_limit' => $limit,
            'planning_ms' => round($planningMs, 3),
            'execution_ms' => round($executionMs, 3),
            'actual_rows' => (int) ($root['Actual Rows'] ?? 0),
            'total_cost' => round((float) ($root['Total Cost'] ?? 0.0), 3),
            'shared_hit_blocks' => (int) ($root['Shared Hit Blocks'] ?? 0),
            'shared_read_blocks' => (int) ($root['Shared Read Blocks'] ?? 0),
            'node_types' => array_values(array_unique($this->nodeTypes($root))),
            'peak_memory_bytes' => memory_get_peak_usage(true),
            'elapsed_ms' => (int) round((hrtime(true) - $started) / 1_000_000),
        ];
        $this->line(json_encode($evidence, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        if ($activeCount < $minActive) {
            $this->error("Inventory scale gate failed: {$activeCount} < {$minActive}.");
            return self::FAILURE;
        }
        if ($maxMs > 0.0 && $executionMs > $maxMs) {
            $this->error("Latency gate failed: {$executionMs}ms > {$maxMs}ms.");
            return self::FAILURE;
        }

        return self::SUCCESS;
    }

    private function nodeTypes(array $node): array
    {
        $types = isset($node['Node Type']) ? [(string) $node['Node Type']] : [];
        foreach ((array) ($node['Plans'] ?? []) as $child) {
            if (is_array($child)) {
                $types = [...$types, ...$this->nodeTypes($child)];
            }
        }

        return $types;
    }
}
