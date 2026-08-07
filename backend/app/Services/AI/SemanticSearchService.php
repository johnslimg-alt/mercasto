<?php

namespace App\Services\AI;

use App\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class SemanticSearchService
{
    public function __construct(private OllamaClient $ollama)
    {
    }

    /**
     * Search genuine active ads through the canonical embeddings table.
     */
    public function search(
        string $query,
        int $limit = 20,
        ?string $category = null,
        ?string $state = null,
        ?float $minPrice = null,
        ?float $maxPrice = null,
        float $similarityThreshold = 0.3
    ): array {
        $queryEmbedding = $this->ollama->embed($query);

        if (! $queryEmbedding) {
            Log::warning('Semantic search failed: no embedding generated');

            return ['results' => [], 'fallback' => true];
        }

        $vectorString = '[' . implode(',', $queryEmbedding) . ']';

        $results = DB::table('ads')
            ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
            ->select('ads.*')
            ->selectRaw('1 - (embeddings.embedding <=> ?::vector) as similarity', [$vectorString])
            ->whereNotNull('embeddings.embedding')
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->when($category, fn ($builder) => $builder->where('ads.category', $category))
            ->when($state, fn ($builder) => $builder->where('ads.state', $state))
            ->when($minPrice, fn ($builder) => $builder->where('ads.price', '>=', $minPrice))
            ->when($maxPrice, fn ($builder) => $builder->where('ads.price', '<=', $maxPrice))
            ->whereRaw('1 - (embeddings.embedding <=> ?::vector) >= ?', [$vectorString, $similarityThreshold])
            ->orderByRaw('embeddings.embedding <=> ?::vector', [$vectorString])
            ->limit($limit)
            ->get();

        $ads = Ad::with(['user'])
            ->whereIn('id', $results->pluck('id'))
            ->get()
            ->keyBy('id');

        return [
            'results' => $results->map(function ($row) use ($ads) {
                $ad = $ads->get($row->id);
                if ($ad) {
                    $ad->similarity_score = round($row->similarity * 100, 1);
                    $ad->search_type = 'semantic';
                }

                return $ad;
            })->filter()->values(),
            'query' => $query,
            'total' => $results->count(),
            'fallback' => false,
        ];
    }

    /**
     * Generate and store an ad embedding in the canonical embeddings table.
     */
    public function generateEmbedding(Ad $ad): bool
    {
        $embedding = $this->ollama->embed($this->buildAdText($ad));

        if (! $embedding) {
            return false;
        }

        $vectorString = '[' . implode(',', $embedding) . ']';

        DB::statement(
            <<<'SQL'
                INSERT INTO embeddings (ad_id, embedding, created_at, updated_at)
                VALUES (?, ?::vector, NOW(), NOW())
                ON CONFLICT (ad_id)
                DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
            SQL,
            [$ad->id, $vectorString]
        );

        Log::info('Embedding generated', ['ad_id' => $ad->id, 'dims' => count($embedding)]);

        return true;
    }

    /**
     * Generate canonical embeddings for active genuine ads that do not have one.
     */
    public function backfillEmbeddings(int $batchSize = 50): array
    {
        $adsWithoutEmbeddings = DB::table('ads')
            ->leftJoin('embeddings', 'ads.id', '=', 'embeddings.ad_id')
            ->whereNull('embeddings.embedding')
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->orderBy('ads.id')
            ->limit($batchSize)
            ->pluck('ads.id');

        $processed = 0;
        $failed = 0;

        foreach ($adsWithoutEmbeddings as $adId) {
            $ad = Ad::find($adId);
            if ($ad && $this->generateEmbedding($ad)) {
                $processed++;
            } else {
                $failed++;
            }

            usleep(100000);
        }

        return [
            'processed' => $processed,
            'failed' => $failed,
            'remaining' => $this->countWithoutEmbeddings(),
        ];
    }

    public function countWithoutEmbeddings(): int
    {
        return DB::table('ads')
            ->leftJoin('embeddings', 'ads.id', '=', 'embeddings.ad_id')
            ->whereNull('embeddings.embedding')
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->count('ads.id');
    }

    private function buildAdText(Ad $ad): string
    {
        $parts = [
            $ad->title ?? '',
            $ad->description ?? '',
            $ad->category ?? '',
            $ad->state ?? '',
            ' ',
        ];

        if ($ad->attributes) {
            $attrs = is_string($ad->attributes) ? json_decode($ad->attributes, true) : $ad->attributes;
            if (is_array($attrs)) {
                foreach ($attrs as $key => $value) {
                    $parts[] = "$key: $value";
                }
            }
        }

        return implode(' | ', array_filter($parts));
    }

    /**
     * Find similar genuine active ads through canonical embeddings.
     */
    public function findSimilar(Ad $ad, int $limit = 10): array
    {
        try {
            $vectorString = DB::table('embeddings')
                ->where('ad_id', $ad->id)
                ->selectRaw('embedding::text as embedding_text')
                ->value('embedding_text');
        } catch (Throwable) {
            return [];
        }

        if (! is_string($vectorString) || $vectorString === '') {
            return [];
        }

        $similar = DB::table('ads')
            ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
            ->select('ads.id')
            ->selectRaw('1 - (embeddings.embedding <=> ?::vector) as similarity', [$vectorString])
            ->where('ads.id', '!=', $ad->id)
            ->whereNotNull('embeddings.embedding')
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->orderByRaw('embeddings.embedding <=> ?::vector', [$vectorString])
            ->limit($limit)
            ->get();

        $ads = Ad::with(['user'])
            ->whereIn('id', $similar->pluck('id'))
            ->get()
            ->keyBy('id');

        return $similar->map(function ($row) use ($ads) {
            $item = $ads->get($row->id);
            if ($item) {
                $item->similarity_score = round(($row->similarity ?? 0) * 100, 1);
            }

            return $item;
        })->filter()->values()->all();
    }
}
