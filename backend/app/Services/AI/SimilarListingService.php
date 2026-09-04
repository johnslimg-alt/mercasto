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
        $embedding = $this->sourceEmbedding($source);
        $result = collect();

        foreach ($this->localityTiers($source) as $locality) {
            if ($result->count() >= $limit) {
                break;
            }

            $excluded = $result->pluck('id')->map(fn ($id): int => (int) $id)->all();
            if ($embedding !== null) {
                $result = $result->merge(
                    $this->semanticTier($source, $embedding, $locality, $limit - $result->count(), $excluded)
                )->unique('id')->values();
            }

            if ($result->count() >= $limit) {
                break;
            }

            $excluded = $result->pluck('id')->map(fn ($id): int => (int) $id)->all();
            $result = $result->merge(
                $this->deterministicTier($source, $locality, $limit - $result->count(), $excluded)
            )->unique('id')->values();
        }

        return $result->take($limit)->values();
    }

    private function sourceEmbedding(Ad $source): ?string
    {
        if (! $this->semanticEnabled() || DB::connection()->getDriverName() !== 'pgsql') {
            return null;
        }

        try {
            $embedding = DB::table('embeddings')
                ->where('ad_id', $source->id)
                ->selectRaw('embedding::text as embedding_text')
                ->value('embedding_text');

            return is_string($embedding) && trim($embedding) !== '' ? $embedding : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function semanticTier(Ad $source, string $embedding, ?string $locality, int $needed, array $excludeIds): Collection
    {
        if ($needed <= 0) {
            return collect();
        }

        try {
            return DB::transaction(function () use ($source, $embedding, $locality, $needed, $excludeIds): Collection {
                DB::statement("SET LOCAL hnsw.iterative_scan = 'strict_order'");

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

                return $query
                    ->orderBy('vec_distance')
                    ->orderByDesc('ads.created_at')
                    ->orderByDesc('ads.id')
                    ->limit($needed)
                    ->get();
            }, 1);
        } catch (Throwable) {
            return collect();
        }
    }

    private function deterministicTier(Ad $source, ?string $locality, int $needed, array $excludeIds): Collection
    {
        if ($needed <= 0) {
            return collect();
        }

        $query = $this->eligible($source);
        if ($excludeIds !== []) {
            $query->whereNotIn('ads.id', $excludeIds);
        }
        $this->applyPriceAndCondition($query, $source);
        $this->applyLocalityConstraint($query, $source, $locality);

        return $query
            ->orderByDesc('ads.created_at')
            ->orderByDesc('ads.id')
            ->limit($needed)
            ->get();
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
        $aliases = $this->conditionAliases($source->condition);
        if ($aliases !== []) {
            $query->whereIn('ads.condition', $aliases);
        }
    }

    private function applyPriceBand(Builder $query, Ad $source): void
    {
        $rawPrice = $source->getRawOriginal('price');
        if ($rawPrice === null || $rawPrice === '') {
            return;
        }

        $price = (float) $rawPrice;
        if ($price <= 0) {
            $zeroMax = max(0.0, (float) config('semantic_discovery.similar.zero_price_max', 0));
            $query->whereBetween('ads.price', [0, $zeroMax]);

            return;
        }

        $min = $price * (float) config('semantic_discovery.similar.price_min_ratio', 0.5);
        $max = $price * (float) config('semantic_discovery.similar.price_max_ratio', 1.75);
        $query->whereBetween('ads.price', [max(0, $min), max($min, $max)]);
    }

    private function conditionAliases(mixed $condition): array
    {
        $value = mb_strtolower(trim((string) $condition), 'UTF-8');

        return match ($value) {
            'new', 'nuevo' => ['new', 'nuevo'],
            'used', 'usado' => ['used', 'usado'],
            '' => [],
            default => [$value],
        };
    }

    private function localityTiers(Ad $source): array
    {
        [$city, $state] = $this->sourceLocality($source);
        $tiers = [];
        if ($city !== '') {
            $tiers[] = 'city';
        }
        if ($state !== '') {
            $tiers[] = 'state';
        }
        $tiers[] = null;

        return $tiers;
    }

    private function sourceLocality(Ad $source): array
    {
        $city = trim((string) $source->city);
        $state = trim((string) $source->state);
        $location = trim((string) $source->location);

        if ($location !== '' && ($city === '' || $state === '')) {
            $parts = array_values(array_filter(
                array_map('trim', explode(',', $location)),
                fn (string $part): bool => $part !== ''
            ));
            if ($city === '' && count($parts) >= 2) {
                $city = $parts[0];
            }
            if ($state === '' && count($parts) >= 2) {
                $state = $parts[count($parts) - 1];
            }
        }

        return [$city, $state];
    }

    private function applyLocalityConstraint(Builder $query, Ad $source, ?string $locality): void
    {
        [$city, $state] = $this->sourceLocality($source);
        $cityNormalized = mb_strtolower(trim($city), 'UTF-8');
        $stateNormalized = mb_strtolower(trim($state), 'UTF-8');

        if ($locality === 'city' && $cityNormalized !== '') {
            $legacyExact = $stateNormalized !== ''
                ? $cityNormalized.','.$stateNormalized
                : $cityNormalized;
            $query->where(function (Builder $scope) use ($cityNormalized, $stateNormalized, $legacyExact) {
                $scope->where(function (Builder $explicit) use ($cityNormalized, $stateNormalized) {
                    $explicit->whereRaw('LOWER(TRIM(ads.city)) = ?', [$cityNormalized]);
                    if ($stateNormalized !== '') {
                        $explicit->whereRaw('LOWER(TRIM(ads.state)) = ?', [$stateNormalized]);
                    }
                })->orWhere(function (Builder $legacy) use ($legacyExact) {
                    $legacy->whereRaw("TRIM(COALESCE(ads.city, '')) = ''")
                        ->whereRaw("LOWER(REPLACE(TRIM(ads.location), ', ', ',')) = ?", [$legacyExact]);
                });
            });

            return;
        }

        if ($locality === 'state' && $stateNormalized !== '') {
            $stateSuffix = '%,'.$stateNormalized;
            $query->where(function (Builder $scope) use ($stateNormalized, $stateSuffix) {
                $scope->whereRaw('LOWER(TRIM(ads.state)) = ?', [$stateNormalized])
                    ->orWhere(function (Builder $legacy) use ($stateNormalized, $stateSuffix) {
                        $legacy->whereRaw("TRIM(COALESCE(ads.state, '')) = ''")
                            ->where(function (Builder $location) use ($stateNormalized, $stateSuffix) {
                                $location->whereRaw("LOWER(REPLACE(TRIM(ads.location), ', ', ',')) = ?", [$stateNormalized])
                                    ->orWhereRaw("LOWER(REPLACE(TRIM(ads.location), ', ', ',')) LIKE ?", [$stateSuffix]);
                            });
                    });
            });
        }
    }

    private function semanticEnabled(): bool
    {
        return (bool) config('semantic_discovery.enabled', true)
            && (bool) config('semantic_discovery.similar.semantic_enabled', true);
    }
}
