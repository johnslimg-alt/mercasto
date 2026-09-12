<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SubmitIndexNowUrl;
use App\Models\Ad;
use App\Support\ListingIndexability;
use App\Support\SeoIndexability;
use Illuminate\Support\Facades\Log;

/**
 * IndexNow submission for listing changes (Bing, Yandex, Seznam, Naver, Yep - not Google).
 *
 * The former HTTP endpoints (`submitUrl`, `submitBatch`, `getKey`) were never routed and were
 * removed; the live path is the ad lifecycle: AdObserver and the bulk reactivation endpoint
 * call notifyAdChange(), which queues App\Jobs\SubmitIndexNowUrl. The public key must be served
 * verbatim at /{key}.txt (public/{key}.txt) for the receiving engines to accept a submission -
 * scripts/indexnow-contract.test.mjs keeps the controller, the key file and the daily batch
 * script (scripts/submit-all-to-indexnow.sh) in sync.
 */
class IndexNowController extends Controller
{
    /**
     * Queue a submission for the canonical (indexable) URL of an ad.
     *
     * The old implementation posted synchronously inside the publish request with Laravel's
     * default timeout, which is why a slow third party could stall a write (and why 588
     * production submissions were logged as failures). The submission is now queued.
     */
    public static function notifyAdChange(Ad $ad, string $action = 'update'): void
    {
        // Only ever advertise what the canonical sitemap advertises. A pending, archived,
        // paused or lapsed listing (or a catalog reference) is noindex or 404, so submitting
        // it would ask search engines to fetch a URL we deliberately keep out of the index.
        if (! ListingIndexability::isIndexable($ad)) {
            return;
        }

        // Canonical listing route, from the shared policy: `/ad/{id}` is registered neither
        // in web.php nor in nginx, so submitting it asked IndexNow to crawl a soft-404.
        // (The URL fix landed with #1135; this change only takes the submission off the
        // request path, so the two are complementary rather than alternative.)
        $url = SeoIndexability::listingUrl($ad->id);

        Log::info('Ad change queued for IndexNow', [
            'ad_id' => $ad->id,
            'action' => $action,
            'url' => $url,
        ]);

        SubmitIndexNowUrl::dispatch($url);
    }

}
