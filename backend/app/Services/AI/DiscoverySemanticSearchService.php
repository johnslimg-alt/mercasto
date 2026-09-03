<?php

namespace App\Services\AI;

use App\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class DiscoverySemanticSearchService extends SemanticSearchService
{
    public function __construct(private OllamaClient $discoveryOllama)
    {
        parent::__construct($discoveryOllama);
    }

    public function search(
        string $query,
        int $limit = 20,
        ?string $category = null,
        ?string $state = null,
        ?float $minPrice = null,
        ?float $maxPrice = null,
        float $similarityThreshold = 0.3
    ): array {
        $startedAt = microtime(true);
        $result = parent::search(
            $query,
            min(max(1, $limit), 200),
            $category,
            $state,
            $minPrice,
            $maxPrice,
            $similarityThreshold,
        );

        Log::info('Discovery semantic retrieval', [
            'query_hash' => hash('sha256', mb_strtolower(trim($query), 'UTF-8')),
            'results' => count($result['results'] ?? []),
            'fallback' => (bool) ($result['fallback'] ?? false),
            'runtime_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'model' => (string) config('discovery.semantic.model'),
            'dimensions' => (int) config('discovery.semantic.dimensions', 768),
            'index' => (string) config('discovery.semantic.index', 'hnsw/vector_cosine_ops'),
        ]);

        return $result;
    }

    public function generateEmbedding(Ad $ad): bool
    {
        $embedding = $this->discoveryOllama->embed($this->discoveryText($ad));
        $dimensions = max(1, (int) config('discovery.semantic.dimensions', 768));
        if (! is_array($embedding) || count($embedding) !== $dimensions) {
            return false;
        }

        DB::statement(
            <<<'SQL'
                INSERT INTO embeddings (ad_id, embedding, created_at, updated_at)
                VALUES (?, ?::vector, NOW(), NOW())
                ON CONFLICT (ad_id)
                DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
            SQL,
            [$ad->id, '['.implode(',', $embedding).']']
        );

        Log::info('Discovery embedding refreshed', [
            'ad_id' => $ad->id,
            'dimensions' => count($embedding),
            'model' => (string) config('discovery.semantic.model'),
        ]);

        return true;
    }

    public function findSimilar(Ad $ad, int $limit = 10): array
    {
        try {
            $vector = DB::table('embeddings')
                ->where('ad_id', $ad->id)
                ->selectRaw('embedding::text as embedding_text')
                ->value('embedding_text');
        } catch (Throwable) {
            return [];
        }

        if (! is_string($vector) || $vector === '') {
            return [];
        }

        $maxDistance = max(0.05, min(1.0, (float) config('discovery.similar.max_distance', 0.45)));
        $query = DB::table('ads')
            ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
            ->select('ads.id')
            ->selectRaw('(embeddings.embedding <=> ?::vector) as vec_distance', [$vector])
            ->where('ads.id', '!=', $ad->id)
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->whereNotNull('embeddings.embedding')
            ->where(function ($builder) {
                $builder->whereNull('ads.expires_at')->orWhere('ads.expires_at', '>', now());
            })
            ->whereRaw('(embeddings.embedding <=> ?::vector) <= ?', [$vector, $maxDistance]);

        if (is_string($ad->category) && trim($ad->category) !== '') {
            $query->where('ads.category', $ad->category);
        }
        if (is_string($ad->condition) && trim($ad->condition) !== '') {
            $query->where('ads.condition', $ad->condition);
        }

        $price = (float) ($ad->price ?? 0);
        if ($price > 0) {
            $floor = max(0.0, (float) config('discovery.similar.price_floor_ratio', 0.5));
            $ceiling = max($floor, (float) config('discovery.similar.price_ceiling_ratio', 1.5));
            $query->whereBetween('ads.price', [$price * $floor, $price * $ceiling]);
        }

        if (is_string($ad->state) && trim($ad->state) !== '') {
            $query->orderByRaw('CASE WHEN ads.state = ? THEN 0 ELSE 1 END', [$ad->state]);
        }

        $similar = $query
            ->orderBy('vec_distance')
            ->orderByRaw("CASE WHEN ads.promoted IS NOT NULL AND (ads.boost_expires_at IS NULL OR ads.boost_expires_at > CURRENT_TIMESTAMP) THEN 0 ELSE 1 END")
            ->orderByDesc('ads.created_at')
            ->limit(min(max(1, $limit), 24))
            ->get();

        $ads = Ad::with('user:id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp')
            ->whereIn('id', $similar->pluck('id'))
            ->get()
            ->keyBy('id');

        return $similar->map(function ($row) use ($ads) {
            $item = $ads->get($row->id);
            if ($item) {
                $item->similarity_score = round((1 - (float) $row->vec_distance) * 100, 1);
            }

            return $item;
        })->filter()->values()->all();
    }

    private function discoveryText(Ad $ad): string
    {
        $parts = [
            $ad->title,
            $ad->description,
            $ad->category,
            $ad->subcategory,
            $ad->condition,
            $ad->location,
            $ad->city,
            $ad->state,
        ];
        foreach ((array) $ad->attributes as $key => $value) {
            if (is_scalar($value) && trim((string) $value) !== '') {
                $parts[] = $key.': '.$value;
            }
        }

        return implode(' | ', array_values(array_filter(
            array_map(fn ($value) => trim(strip_tags((string) $value)), $parts),
            fn ($value) => $value !== '',
        )));
    }
}
