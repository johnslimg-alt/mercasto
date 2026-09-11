<?php

namespace App\Support;

use App\Models\Ad;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Single source of truth for "which Mercasto listings search engines may index".
 *
 * A listing is indexable when it is:
 *  - not a catalog reference / placeholder (`is_catalog_filler = false`),
 *  - publicly visible (`status = active`, the same gate used by AdController::index and
 *    SeoShellController::ad),
 *  - still available (`expires_at` set and in the future; every real activation path writes
 *    `Ad::freshExpiry()`).
 *
 * The ad detail SEO shell renders `noindex,follow` for every listing outside this contract, so
 * the XML sitemap must never advertise a URL outside of it. Keep both call sites wired to this
 * class instead of duplicating the predicate: the empty `sitemap-ads.xml` regression of
 * 2026-08-05 came from a hand-copied filter drifting away from the shipped data.
 */
final class ListingIndexability
{
    public static function apply(Builder $query, ?DateTimeInterface $now = null): Builder
    {
        $now ??= now();

        return $query
            ->where('ads.is_catalog_filler', false)
            ->where('ads.status', 'active')
            ->whereNotNull('ads.expires_at')
            ->where('ads.expires_at', '>', $now);
    }

    public static function isIndexable(Ad $ad, ?DateTimeInterface $now = null): bool
    {
        $now ??= now();

        return ! $ad->is_catalog_filler
            && $ad->status === 'active'
            && $ad->expires_at !== null
            && $ad->expires_at->greaterThan($now);
    }
}
