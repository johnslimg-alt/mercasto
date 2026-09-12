<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

/**
 * Ranking policy for editorial "catalog reference" rows in the public catalog.
 *
 * Context: the public catalog can be seeded with catalog-reference rows
 * (`ads.is_catalog_filler = true`) so an empty marketplace still renders a usable
 * grid. They are editorial placeholders, not seller inventory. Before this policy
 * the public listing ordered them by promotion/`ads.id` like any other ad, so the
 * whole public catalog was placeholders while real ads existed.
 *
 * POLICY
 * ------
 * 1. Real inventory first, always. Seller inventory (`is_catalog_filler = false`)
 *    is ordered before catalog references for every filter and every sort mode.
 *    The key is prepended to the ORDER BY list, ahead of promotions and of
 *    price/date/views ordering, so a boosted placeholder can never displace real
 *    inventory.
 * 2. Padding only. Because of (1), references can only ever appear as a trailing
 *    run of a page: they fill the slots real inventory did not fill.
 * 3. Explicit cap. A rendered page never exposes more than MAX_FILLERS_PER_PAGE
 *    references, and the public catalog never serves references past
 *    MAX_FILLER_PAGE. Worst case the public catalog exposes
 *    MAX_FILLERS_PER_PAGE * MAX_FILLER_PAGE = 80 reference rows in total.
 * 4. Premium and derived surfaces keep excluding references entirely
 *    (`where('is_catalog_filler', false)`): the featured "Destacados" block,
 *    semantic/hybrid search, similar listings and recommendations must never be
 *    filled with editorial placeholders.
 *
 * The cap is applied to the emitted page instead of the underlying result set, so
 * offset pagination keeps its exact window: pages never duplicate nor skip rows,
 * and real inventory is never dropped to make room for padding. The paginator
 * totals still count references, which is intentional: it keeps deep-linking and
 * "next page" controls stable while the page itself stays bounded.
 */
final class CatalogInventoryRanking
{
    public const FILLER_COLUMN = 'ads.is_catalog_filler';

    /** Maximum number of catalog references rendered on a single page. */
    public const MAX_FILLERS_PER_PAGE = 8;

    /** Last catalog page number that may still contain catalog references. */
    public const MAX_FILLER_PAGE = 10;

    /**
     * Order real seller inventory ahead of catalog references.
     *
     * Must be the first ORDER BY clause of the query so that it outranks
     * promotions and the requested sort mode.
     */
    public static function realInventoryFirst(Builder $query): Builder
    {
        return $query->orderBy(self::FILLER_COLUMN, 'asc');
    }

    /**
     * Catalog references are padding for the head of the catalog only: deep pages
     * are served without them instead of becoming an endless placeholder wall.
     */
    public static function boundFillerPages(Builder $query, int $page): Builder
    {
        if ($page > self::MAX_FILLER_PAGE) {
            return $query->where(self::FILLER_COLUMN, false);
        }

        return $query;
    }

    /**
     * Drop the padding surplus from an already paginated page.
     *
     * Real rows are never removed; only trailing references beyond the cap are
     * dropped, so page offsets stay aligned with the underlying result set.
     */
    public static function capPageFillers(
        LengthAwarePaginator $paginator,
        int $maxFillers = self::MAX_FILLERS_PER_PAGE,
    ): LengthAwarePaginator {
        $items = $paginator->items();
        $kept = [];
        $fillers = 0;

        foreach ($items as $item) {
            if (self::isCatalogReference($item)) {
                if ($fillers >= $maxFillers) {
                    continue;
                }

                $fillers++;
            }

            $kept[] = $item;
        }

        if (count($kept) !== count($items)) {
            $paginator->setCollection(collect($kept));
        }

        return $paginator;
    }

    /**
     * Explicit filler marker check. Only an explicit truthy flag marks a row as a
     * catalog reference; anything else — null or a missing attribute — is treated as
     * real inventory.
     *
     * That is the safe direction for this policy, and it is deliberately asymmetric:
     * an unexpected payload can only make a reference look real for one request, never
     * make real inventory lose its ranking or its padding cap. In practice the listing
     * queries select `ads.*`, so the flag is always present and this branch is not hit;
     * the default only matters if a future partial select drops the column, and the
     * consequence there is under-counting padding rather than hiding real inventory.
     */
    public static function isCatalogReference(mixed $item): bool
    {
        return (bool) data_get($item, 'is_catalog_filler', false);
    }
}
