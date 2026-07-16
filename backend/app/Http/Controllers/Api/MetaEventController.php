<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MetaCapiService;
use App\Services\TikTokEventsApiService;
use Illuminate\Http\Request;

class MetaEventController extends Controller
{
    public function postAd(Request $request, MetaCapiService $meta, TikTokEventsApiService $tiktok)
    {
        return $this->sendClassifiedEvent($request, $meta, $tiktok, 'PostAd', 'Lead', 'published');
    }

    public function contact(Request $request, MetaCapiService $meta, TikTokEventsApiService $tiktok)
    {
        return $this->sendClassifiedEvent($request, $meta, $tiktok, 'Contact', 'Contact', 'contacted');
    }

    public function addToWishlist(Request $request, MetaCapiService $meta, TikTokEventsApiService $tiktok)
    {
        return $this->sendClassifiedEvent($request, $meta, $tiktok, 'AddToWishlist', 'AddToWishlist', 'saved');
    }

    private function sendClassifiedEvent(
        Request $request,
        MetaCapiService $meta,
        TikTokEventsApiService $tiktok,
        string $metaEventName,
        string $tiktokEventName,
        string $status
    ) {
        $validated = $request->validate([
            'event_id' => ['required', 'string', 'max:120', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'listing_id' => ['required'],
            'category' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'method' => ['nullable', 'string', 'max:40'],
            'url' => ['nullable', 'url'],
        ]);

        $listingId = (string) $validated['listing_id'];
        $category = $validated['category'] ?? null;
        $eventSourceUrl = $validated['url'] ?? null;
        $customData = array_filter([
            'content_type' => 'classified_ad',
            'listing_id' => $listingId,
            'category' => $category,
            'city' => $validated['city'] ?? null,
            'contact_method' => $validated['method'] ?? null,
            'currency' => 'MXN',
            'value' => 0,
        ], fn ($value) => $value !== null && $value !== '');

        $metaResult = $meta->send(
            $metaEventName,
            $request,
            $request->user(),
            $customData,
            $validated['event_id'],
            $eventSourceUrl
        );

        $tiktokResult = $tiktok->send(
            $tiktokEventName,
            $request,
            $request->user(),
            [
                'content_type' => 'product',
                'content_ids' => ['ad_' . $listingId],
                'contents' => [[
                    'content_id' => 'ad_' . $listingId,
                    'content_type' => 'product',
                    'content_name' => 'Mercasto classified listing',
                    'content_category' => $category,
                    'quantity' => 1,
                ]],
                'content_category' => $category,
                'status' => $status,
            ],
            $validated['event_id'],
            $eventSourceUrl
        );

        return response()->json([
            'ok' => (bool) (($metaResult['ok'] ?? false) || ($tiktokResult['ok'] ?? false)),
            'meta_ok' => (bool) ($metaResult['ok'] ?? false),
            'tiktok_ok' => (bool) ($tiktokResult['ok'] ?? false),
            'event_id' => $validated['event_id'],
            'skipped' => (bool) (($metaResult['skipped'] ?? false) && ($tiktokResult['skipped'] ?? false)),
        ]);
    }
}
