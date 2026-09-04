<?php

namespace App\Services\AI;

use App\Models\Ad;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Throwable;

class SimilarListingService
{
    private const PUBLIC_USER_COLUMNS = 'id,name,role,avatar_url,is_verified,created_at,whatsapp,telegram_username,business_whatsapp';

    public function find(Ad $source): Collection
    {
        $limit = max(1, min(12, (int) config('semantic_discovery.similar.limit', 8)));
        $semantic = $this->semanticCandidates($source, $limit);
        $ids = $semantic->pluck('id')->map(fn ($id): int => (int) $id)->all();

        if ($semantic->count() < $limit) {
            $semantic = $semantic->merge(
                $this->deterministicCandidates($source, $limit - $semantic->count(), $ids)
            );
        }

        return $semantic->unique('id')->take($limit)->values();
    }

    private function semanticCandidates(Ad $source, int $limit): Collection
    {
        if (! $this->semanticEnabled() || DB::connection()->getDriverName() !== 'pgsql') {
            return collect();
        }

        try {
            $embedding = DB::table('embeddings')
                ->where('ad_id', $source->id)
                ->selectRaw('embedding::text as embedding_text')
                ->value('embedding_text');
            if (! is_string($embedding) || trim($embedding) === '') {
                return collect();
            }

            $result = collect();
            foreach ($this->localityTiers($source) as $locality) {
                if ($result->count() >= $limit) {
                    break;
                }

                $excludeIds = $result->pluck('id')->map(fn ($id): int => (int) $id)->all();
                $query = $this->eligible($source)
                    ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
                    ->select('ads.*')
                    ->selectRaw('(embeddings.embedding <=> ?::vector) AS vec_distance', [$embedding])
                    ->whereNotNull('embeddings.embedding')
                    ->whereRaw(
                        '(embeddings.embedding <=> ?::vector) <= ?',
                        [$embedding, (float) config('semantic_discovery.similar.max_distance', 0.45)]
                    );
                if ($excludeIds !== []) {
                    $query->whereNotIn('ads.id', $excludeIds);
                }
                $this->applyPriceAndCondition($query, $source);
                $this->applyLocalityConstraint($query, $source, $locality);

                // Keep vector distance as the leading order so PostgreSQL/pgvector
                // can use the HNSW nearest-neighbor index inside each bounded
                // locality tier. Locality preference comes from the tier order.
                $batch = $query
                    ->orderBy('vec_distance')
                    ->orderByDesc('ads.created_at')
                    ->orderByDesc('ads.id')
                    ->limit($limit - $result->count())
                    ->get();
                $result = $result->merge($batch)->unique('id')->values();
            }

            return $result->take($limit)->values();
        } catch (Throwable) {
            return collect();
        }
    }

    private function deterministicCandidates(Ad $source, int $needed, array $excludeIds): Collection
    {
        if ($needed <= 0) {
            return collect();
        }

        $result = collect();
        foreach ($this->localityTiers($source) as $locality) {
            if ($result->count() >= $needed) {
                break;
            }

            $excluded = array_values(array_unique(array_merge(
                $excludeIds,
                $result->pluck('id')->map(fn ($id): int => (int) $id)->all(),
            )));
            $query = $this->eligible($source);
            if ($excluded !== []) {
                $query->whereNotIn('ads.id', $excluded);
            }
            $this->applyPriceAndCondition($query, $source);
            $this->applyLocalityConstraint($query, $source, $locality);

            $batch = $query
                ->orderByDesc('ads.created_at')
                ->orderByDesc('ads.id')
                ->limit($needed - $result->count())
                ->get();
            $result = $result->merge($batch)->unique('id')->values();
        }

        return $result->take($needed)->values();
    }

    private function eligible(Ad $source): Builder
    {
        return Ad::with('user:'.self::PUBLIC_USER_COLUMNS)
            ->where('ads.status', 'active')
            ->where('ads.is_catalog_filler', false)
            ->where('ads.id', '!=', $source->id)
            ->where('ads.category', $source->category)
            ->where(function (Builder $query) {
                $query->whereNull('ads.expires_at')
                    ->orWhere('ads.expires_at', '>', now());
            });
    }

    private function applyPriceAndCondition(Builder $query, Ad $source): void
    {
        $this->applyPriceBand($query, $source);
        if (trim((string) $source->condition) !== '') {
            $query->where('ads.condition', $source->condition);
        }
    }

    private function applyPriceBand(Builder $query, Ad $source): void
    {
        $price = (float) ($source->price ?? 0);
        if ($price <= 0) {
            return;
        }

        $min = $price * (float) config('semantic_discovery.similar.price_min_ratio', 0.5);
        $max = $price * (float) config('semantic_discovery.similar.price_max_ratio', 1.75);
        $query->whereBetween('ads.price', [max(0, $min), max($min, $max)]);
    }

    private function localityTiers(Ad $source): array
    {
        $tiers = [];
        if (trim((string) $source->city) !== '') {
            $tiers[] = 'city';
        }
        if (trim((string) $source->state) !== '') {
            $tiers[] = 'state';
        }
        $tiers[] = null;

        return $tiers;
    }

    private function applyLocalityConstraint(Builder $query, Ad $source, ?string $locality): void
    {
        if ($locality === 'city') {
            $query->whereRaw('LOWER(ads.city) = ?', [mb_strtolower(trim((string) $source->city), 'UTF-8')]);
            if (trim((string) $source->state) !== '') {
                $query->whereRaw('LOWER(ads.state) = ?', [mb_strtolower(trim((string) $source->state), 'UTF-8')]);
            }

            return;
        }

        if ($locality === 'state') {
            $query->whereRaw('LOWER(ads.state) = ?', [mb_strtolower(trim((string) $source->state), 'UTF-8')]);
        }
    }

    private function semanticEnabled(): bool
    {
        return (bool) config('semantic_discovery.enabled', true)
            && (bool) config('semantic_discovery.similar.semantic_enabled', true);
    }
}
