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

            $query = $this->eligible($source)
                ->join('embeddings', 'ads.id', '=', 'embeddings.ad_id')
                ->select('ads.*')
                ->selectRaw('(embeddings.embedding <=> ?::vector) AS vec_distance', [$embedding])
                ->whereNotNull('embeddings.embedding')
                ->whereRaw(
                    '(embeddings.embedding <=> ?::vector) <= ?',
                    [$embedding, (float) config('semantic_discovery.similar.max_distance', 0.45)]
                );
            $this->applyPriceAndCondition($query, $source);

            $this->orderByLocality($query, $source);

            return $query
                ->orderBy('vec_distance')
                ->orderByDesc('ads.created_at')
                ->limit($limit)
                ->get();
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
        $tiers = [
            ['locality' => 'city', 'condition' => true, 'price' => true],
            ['locality' => 'state', 'condition' => true, 'price' => true],
            ['locality' => null, 'condition' => true, 'price' => true],
            ['locality' => null, 'condition' => false, 'price' => true],
            ['locality' => null, 'condition' => false, 'price' => false],
        ];

        foreach ($tiers as $tier) {
            if ($result->count() >= $needed) {
                break;
            }

            $query = $this->eligible($source)
                ->whereNotIn('ads.id', array_values(array_unique(array_merge(
                    $excludeIds,
                    $result->pluck('id')->map(fn ($id): int => (int) $id)->all(),
                ))));

            if ($tier['price']) {
                $this->applyPriceBand($query, $source);
            }
            if ($tier['condition'] && trim((string) $source->condition) !== '') {
                $query->where('ads.condition', $source->condition);
            }
            if ($tier['locality'] === 'city' && trim((string) $source->city) !== '') {
                $query->whereRaw('LOWER(ads.city) = ?', [mb_strtolower(trim((string) $source->city), 'UTF-8')]);
            } elseif ($tier['locality'] === 'state' && trim((string) $source->state) !== '') {
                $query->whereRaw('LOWER(ads.state) = ?', [mb_strtolower(trim((string) $source->state), 'UTF-8')]);
            }

            $batch = $query
                ->orderByDesc('ads.created_at')
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

    private function orderByLocality(Builder $query, Ad $source): void
    {
        $city = mb_strtolower(trim((string) $source->city), 'UTF-8');
        $state = mb_strtolower(trim((string) $source->state), 'UTF-8');
        if ($city !== '') {
            $query->orderByRaw('CASE WHEN LOWER(ads.city) = ? THEN 0 ELSE 1 END', [$city]);
        }
        if ($state !== '') {
            $query->orderByRaw('CASE WHEN LOWER(ads.state) = ? THEN 0 ELSE 1 END', [$state]);
        }
    }

    private function semanticEnabled(): bool
    {
        return (bool) config('semantic_discovery.enabled', true)
            && (bool) config('semantic_discovery.similar.semantic_enabled', true);
    }
}
