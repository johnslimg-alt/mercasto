<?php

namespace App\Services\AI;

use App\Models\Ad;
use App\Support\SqlLikePattern;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Throwable;

class HybridSearchService
{
    private const PUBLIC_USER_COLUMNS = 'id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp';

    public function search(string $query, array $filters = [], int $page = 1): array
    {
        $query = trim($query);
        $perPage = max(1, min(50, (int) config('semantic_discovery.per_page', 16)));

        $exact = $this->exactQuery($query, $filters)
            ->paginate($perPage, ['*'], 'page', $page);
        if ($exact->total() > 0) {
            return $this->result($exact, 'exact');
        }

        if ($this->supportsTrigram()) {
            $fuzzy = $this->fuzzyQuery($query, $filters)
                ->paginate($perPage, ['*'], 'page', $page);
            if ($fuzzy->total() > 0) {
                return $this->result($fuzzy, 'fuzzy');
            }
        }

        $semantic = $this->semanticSearch($query, $filters, $page, $perPage);
        if ($semantic !== null && $semantic->total() > 0) {
            return $this->result($semantic, 'semantic_fallback');
        }

        return $this->result($exact, 'deterministic_empty');
    }

    private function exactQuery(string $query, array $filters): Builder
    {
        $normalized = mb_strtolower($query, 'UTF-8');
        $term = SqlLikePattern::contains($normalized);
        $titleLike = $this->containsExpression('ads.title');
        $descriptionLike = $this->containsExpression('ads.description');

        $builder = $this->publicAds()
            ->where(function (Builder $scope) use ($term, $titleLike, $descriptionLike) {
                $scope->whereRaw($titleLike, [$term])
                    ->orWhereRaw($descriptionLike, [$term]);
            });

        $this->applyFilters($builder, $filters);

        return $builder
            ->orderByRaw("CASE WHEN {$titleLike} THEN 0 ELSE 1 END", [$term])
            ->orderByDesc('ads.created_at');
    }

    private function fuzzyQuery(string $query, array $filters): Builder
    {
        $normalized = mb_strtolower($query, 'UTF-8');
        $builder = $this->publicAds()
            ->whereRaw('ads.title %> ?', [$normalized]);
        $this->applyFilters($builder, $filters);

        return $builder
            ->orderByRaw('word_similarity(?, ads.title) DESC', [$normalized])
            ->orderByDesc('ads.created_at');
    }

    private function semanticSearch(string $query, array $filters, int $page, int $perPage): ?LengthAwarePaginator
    {
        if (! $this->semanticEnabled() || ! $this->hasSemanticCoverage()) {
            return null;
        }

        $baseUrl = rtrim((string) config('services.ollama.base_url', 'http://ollama:11434'), '/');
        if (! $this->isPrivateOllamaUrl($baseUrl)) {
            return null;
        }

        try {
            $timeout = max(1, min(5, (int) config('semantic_discovery.timeout_seconds', 3)));
            $response = Http::connectTimeout(min(2, $timeout))
                ->timeout($timeout)
                ->post($baseUrl.'/api/embeddings', [
                    'model' => (string) config('semantic_discovery.embedding_model', 'nomic-embed-text'),
                    'prompt' => $query,
                ]);
            $embedding = $response->successful() ? $response->json('embedding') : null;
            if (! is_array($embedding) || $embedding === []) {
                return null;
            }

            $embeddingString = '['.implode(',', array_map('floatval', $embedding)).']';
            $maxDistance = (float) config('semantic_discovery.max_distance', 0.35);
            $builder = $this->publicAds()
                ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
                ->selectRaw('ads.*, (embeddings.embedding <=> ?) AS vec_distance', [$embeddingString])
                ->whereRaw('(embeddings.embedding <=> ?) <= ?', [$embeddingString, $maxDistance]);
            $this->applyFilters($builder, $filters, 'ads');

            return $builder
                ->orderBy('vec_distance')
                ->paginate($perPage, ['*'], 'page', $page);
        } catch (Throwable) {
            return null;
        }
    }

    private function publicAds(): Builder
    {
        return Ad::with('user:'.self::PUBLIC_USER_COLUMNS)
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false);
    }

    private function applyFilters(Builder $query, array $filters, string $prefix = 'ads'): void
    {
        $column = static fn (string $name): string => $prefix.'.'.$name;
        if (($filters['category'] ?? '') !== '') {
            $query->where($column('category'), $filters['category']);
        }
        if (($filters['state'] ?? '') !== '') {
            $state = trim((string) $filters['state']);
            if (DB::connection()->getDriverName() === 'pgsql') {
                $query->whereRaw(
                    SqlLikePattern::clause($column('state').' ILIKE ?'),
                    [SqlLikePattern::escape($state)],
                );
            } else {
                $query->whereRaw('LOWER('.$column('state').') = ?', [mb_strtolower($state, 'UTF-8')]);
            }
        }
        if (isset($filters['min_price'])) {
            $query->where($column('price'), '>=', $filters['min_price']);
        }
        if (isset($filters['max_price'])) {
            $query->where($column('price'), '<=', $filters['max_price']);
        }
        $conditions = array_values(array_filter((array) ($filters['condition'] ?? []), 'is_string'));
        if ($conditions !== []) {
            $query->whereIn($column('condition'), array_slice($conditions, 0, 10));
        }
    }

    private function containsExpression(string $column): string
    {
        return SqlLikePattern::clause(
            DB::connection()->getDriverName() === 'pgsql'
                ? $column.' ILIKE ?'
                : 'LOWER('.$column.') LIKE ?',
        );
    }

    private function supportsTrigram(): bool
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return false;
        }

        return Cache::remember('search:pg_trgm_available', 3600, static function (): bool {
            try {
                $row = DB::selectOne("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') AS available");

                return filter_var($row->available ?? false, FILTER_VALIDATE_BOOL);
            } catch (Throwable) {
                return false;
            }
        });
    }

    private function hasSemanticCoverage(): bool
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return false;
        }

        return Cache::remember('search:genuine_semantic_coverage', 300, static function (): bool {
            try {
                return DB::table('embeddings')
                    ->join('ads', 'ads.id', '=', 'embeddings.ad_id')
                    ->where('ads.status', 'active')
                    ->where('ads.is_catalog_filler', false)
                    ->exists();
            } catch (Throwable) {
                return false;
            }
        });
    }

    private function semanticEnabled(): bool
    {
        return (bool) config('semantic_discovery.enabled', true)
            && config('semantic_discovery.mode', 'fallback_only') === 'fallback_only';
    }

    private function isPrivateOllamaUrl(string $url): bool
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (app()->environment('testing') && str_ends_with($host, '.test')) {
            return true;
        }

        return in_array($host, ['ollama', 'mercasto_ollama', 'mercasto-ollama'], true);
    }

    private function result(LengthAwarePaginator $paginator, string $mode): array
    {
        return [
            'paginator' => $paginator,
            'mode' => $mode,
            'semantic_authoritative' => false,
            'exact_first' => true,
        ];
    }
}
