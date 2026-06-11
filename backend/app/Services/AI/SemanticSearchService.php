<?php

namespace App\Services\AI;

use App\Models\Ad;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SemanticSearchService
{
    private OllamaClient $ollama;

    public function __construct(OllamaClient $ollama)
    {
        $this->ollama = $ollama;
    }

    /**
     * Search ads using semantic similarity (vector embeddings)
     * Understands meaning, not just keywords
     * 
     * Examples:
     *   "auto barato" → finds "carro económico", "vehículo a buen precio"
     *   "phone for gaming" → finds "iPhone 15 Pro Max", "Samsung Galaxy S24 Ultra"
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
        // Get embedding for the query
        $queryEmbedding = $this->ollama->embed($query);
        
        if (!$queryEmbedding) {
            Log::warning('Semantic search failed: no embedding generated');
            return ['results' => [], 'fallback' => true];
        }

        // Convert embedding array to PostgreSQL vector format
        $vectorString = '[' . implode(',', $queryEmbedding) . ']';

        // Build the query with cosine distance
        $results = DB::table('ads')
            ->select([
                'ads.*',
                DB::raw('1 - (embedding <=> ?::vector) as similarity'),
            ])
            ->whereNotNull('embedding')
            ->where('status', 'active')
            ->addBinding($vectorString, 'select')
            ->when($category, fn($q) => $q->where('category', $category))
            ->when($state, fn($q) => $q->where('state', $state))
            ->when($minPrice, fn($q) => $q->where('price', '>=', $minPrice))
            ->when($maxPrice, fn($q) => $q->where('price', '<=', $maxPrice))
            ->whereRaw('1 - (embedding <=> ?::vector) >= ?', [$vectorString, $similarityThreshold])
            ->orderByRaw('embedding <=> ?::vector', [$vectorString])
            ->limit($limit)
            ->get(['id', 'user_id', 'title', 'description', 'price', 'location', 'category', 'image_url', 'status', 'created_at', 'views', 'condition', 'state', 'similarity_score']);

        // Enhance results with Ad model
        $adIds = $results->pluck('id')->toArray();
        $ads = Ad::with(['user'])
            ->whereIn('id', $adIds)
            ->get()
            ->keyBy('id');

        // Preserve similarity scores
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
     * Generate and store embedding for an ad
     * Called when ad is created or updated
     */
    public function generateEmbedding(Ad $ad): bool
    {
        // Build text representation for embedding
        $text = $this->buildAdText($ad);
        
        $embedding = $this->ollama->embed($text);
        
        if (!$embedding) {
            return false;
        }

        $vectorString = '[' . implode(',', $embedding) . ']';
        
        DB::statement(
            'UPDATE ads SET embedding = ?::vector WHERE id = ?',
            [$vectorString, $ad->id]
        );

        Log::info('Embedding generated', ['ad_id' => $ad->id, 'dims' => count($embedding)]);
        return true;
    }

    /**
     * Generate embeddings for all ads that don't have one
     * Run as a scheduled job
     */
    public function backfillEmbeddings(int $batchSize = 50): array
    {
        $adsWithoutEmbeddings = DB::table('ads')
            ->whereNull('embedding')
            ->where('status', 'active')
            ->limit($batchSize)
            ->get(['id', 'user_id', 'title', 'description', 'price', 'location', 'category', 'image_url', 'status', 'created_at', 'views', 'condition', 'state', 'similarity_score']);

        $processed = 0;
        $failed = 0;

        foreach ($adsWithoutEmbeddings as $adRow) {
            $ad = Ad::find($adRow->id);
            if ($ad && $this->generateEmbedding($ad)) {
                $processed++;
            } else {
                $failed++;
            }
            
            // Rate limiting: small delay between API calls
            usleep(100000); // 100ms
        }

        return ['processed' => $processed, 'failed' => $failed, 'remaining' => $this->countWithoutEmbeddings()];
    }

    /**
     * Count ads without embeddings
     */
    public function countWithoutEmbeddings(): int
    {
        return DB::table('ads')
            ->whereNull('embedding')
            ->where('status', 'active')
            ->count();
    }

    /**
     * Build text representation of ad for embedding
     */
    private function buildAdText(Ad $ad): string
    {
        $parts = [
            $ad->title ?? '',
            $ad->description ?? '',
            $ad->category ?? '',
            $ad->state ?? '',
            ' ',
        ];

        // Add attributes if present
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
     * Find similar ads using vector similarity
     */
    public function findSimilar(Ad $ad, int $limit = 10): array
    {
        if (!$ad->embedding) {
            return [];
        }

        $vectorString = is_string($ad->embedding) 
            ? $ad->embedding 
            : '[' . implode(',', is_array($ad->embedding) ? $ad->embedding : json_decode($ad->embedding, true)) . ']';

        $similar = DB::table('ads')
            ->select([
                'ads.*',
                DB::raw('1 - (embedding <=> ?::vector) as similarity'),
            ])
            ->where('id', '!=', $ad->id)
            ->whereNotNull('embedding')
            ->where('status', 'active')
            ->addBinding($vectorString, 'select')
            ->orderByRaw('embedding <=> ?::vector', [$vectorString])
            ->limit($limit)
            ->get(['id', 'user_id', 'title', 'description', 'price', 'location', 'category', 'image_url', 'status', 'created_at', 'views', 'condition', 'state', 'similarity_score']);

        return Ad::with(['user'])
            ->whereIn('id', $similar->pluck('id'))
            ->get()
            ->each(function ($item) use ($similar) {
                $row = $similar->firstWhere('id', $item->id);
                $item->similarity_score = round(($row->similarity ?? 0) * 100, 1);
            });
    }
}
