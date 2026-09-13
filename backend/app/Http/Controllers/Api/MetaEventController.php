<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ad;
use App\Services\MetaCapiService;
use App\Services\OpenAiAdsCapiService;
use App\Services\TikTokEventsApiService;
use App\Support\AnalyticsTrackingConsent;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MetaEventController extends Controller
{
    public function postAd(
        Request $request,
        MetaCapiService $meta,
        TikTokEventsApiService $tiktok,
        OpenAiAdsCapiService $openai
    ) {
        $request->validate(['listing_id' => ['required', 'integer']]);
        $listing = Ad::query()
            ->whereKey((int) $request->input('listing_id'))
            ->where('user_id', $request->user()->id)
            ->whereIn('status', ['pending', 'under_review', 'active'])
            ->where('created_at', '>=', now()->subMinutes(30))
            ->first();

        if (! $listing) {
            throw ValidationException::withMessages([
                'listing_id' => ['El anuncio no pertenece al usuario o no corresponde a una publicación reciente.'],
            ]);
        }

        $request->merge([
            'category' => $listing->category,
            'city' => $listing->city,
        ]);

        return $this->sendClassifiedEvent(
            $request, $meta, $tiktok, $openai, 'PostAd', 'Lead', 'published', 'custom', 'listing_published'
        );
    }

    public function contact(
        Request $request,
        MetaCapiService $meta,
        TikTokEventsApiService $tiktok,
        OpenAiAdsCapiService $openai
    ) {
        return $this->sendClassifiedEvent(
            $request, $meta, $tiktok, $openai, 'Contact', 'Contact', 'contacted'
        );
    }

    public function addToWishlist(
        Request $request,
        MetaCapiService $meta,
        TikTokEventsApiService $tiktok,
        OpenAiAdsCapiService $openai
    ) {
        return $this->sendClassifiedEvent(
            $request, $meta, $tiktok, $openai, 'AddToWishlist', 'AddToWishlist', 'saved'
        );
    }

    private function sendClassifiedEvent(
        Request $request,
        MetaCapiService $meta,
        TikTokEventsApiService $tiktok,
        OpenAiAdsCapiService $openai,
        string $metaEventName,
        string $tiktokEventName,
        string $status,
        ?string $openAiEventType = null,
        ?string $openAiCustomEventName = null
    ) {
        $validated = $request->validate([
            'event_id' => ['required', 'string', 'max:120', 'regex:/^[A-Za-z0-9._:-]+$/'],
            'listing_id' => ['required'],
            'category' => ['nullable', 'string', 'max:120'],
            'city' => ['nullable', 'string', 'max:120'],
            'method' => ['nullable', 'string', 'max:40'],
            'url' => ['nullable', 'url'],
            'openai_measurement_consent' => ['nullable', 'boolean'],
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

        // Receiving this event from the browser is first-party and stays ungated:
        // the relay is a stateless pass-through and stores nothing. Forwarding it
        // to a third party is egress and requires consent for that vendor.
        $vendorEgressAllowed = AnalyticsTrackingConsent::allowsVendorEgress($request, $request->user());

        $metaResult = ['ok' => false, 'skipped' => true, 'reason' => 'consent_required'];
        $tiktokResult = ['ok' => false, 'skipped' => true, 'reason' => 'consent_required'];

        if ($vendorEgressAllowed) {
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
        }

        $openAiResult = ['ok' => false, 'skipped' => true, 'reason' => 'not_requested'];
        if ($openAiEventType
            && AnalyticsTrackingConsent::allowsOpenAiEgress($request, $request->user())) {
            $openAiData = $openAiEventType === 'custom'
                ? [
                    'type' => 'custom',
                    'contents' => [[
                        'id' => 'ad_' . $listingId,
                        'name' => 'Mercasto classified listing',
                        'content_type' => 'classified_listing',
                        'quantity' => 1,
                    ]],
                ]
                : ['type' => 'customer_action'];

            $openAiResult = $openai->send(
                $openAiEventType,
                $request,
                $request->user(),
                $openAiData,
                $validated['event_id'],
                $eventSourceUrl,
                [],
                $openAiCustomEventName
            );
        }

        return response()->json([
            'ok' => (bool) (($metaResult['ok'] ?? false) || ($tiktokResult['ok'] ?? false) || ($openAiResult['ok'] ?? false)),
            'meta_ok' => (bool) ($metaResult['ok'] ?? false),
            'tiktok_ok' => (bool) ($tiktokResult['ok'] ?? false),
            'openai_ok' => (bool) ($openAiResult['ok'] ?? false),
            'event_id' => $validated['event_id'],
            'skipped' => (bool) (($metaResult['skipped'] ?? false)
                && ($tiktokResult['skipped'] ?? false)
                && ($openAiResult['skipped'] ?? false)),
        ]);
    }
}
